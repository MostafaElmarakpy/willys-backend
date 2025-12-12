import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndRelatedTables20241210080000
  implements MigrationInterface
{
  name = 'CreateUsersAndRelatedTables20241210080000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types first
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('USER', 'ADMIN')
    `);

    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM('offline', 'online', 'blocked')
    `);

    await queryRunner.query(`
      CREATE TYPE "user_gender_enum" AS ENUM('male', 'female')
    `);

    await queryRunner.query(`
      CREATE TYPE "user_provider_enum" AS ENUM('system')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "fullName" character varying NOT NULL,
        "email" character varying UNIQUE,
        "password" character varying NOT NULL,
        "changePasswordTime" TIMESTAMP,
        "phoneNumber" character varying,
        "phoneNumberCountryCode" character varying,
        "userLocale" character varying NOT NULL,
        "countryCode" character varying,
        "role" "user_role_enum" NOT NULL DEFAULT 'USER',
        "confirmAccount" boolean NOT NULL DEFAULT false,
        "status" "user_status_enum" NOT NULL DEFAULT 'offline',
        "avatar" character varying,
        "birthday" TIMESTAMP,
        "joined" TIMESTAMP,
        "gender" "user_gender_enum",
        "provider" "user_provider_enum" NOT NULL DEFAULT 'system',
        "verificationCode" character varying,
        "verificationCodeExpiresAt" TIMESTAMP,
        "createdAt" TIMESTAMP,
        "updatedAt" TIMESTAMP,
        "deletedAt" TIMESTAMP,
        "lastLogin" TIMESTAMP,
        "lastLogout" TIMESTAMP,
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // Create index on email for faster lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_users_email" ON "users" ("email")
    `);

    // Create index on role for filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_users_role" ON "users" ("role")
    `);

    // Create index on status for filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_users_status" ON "users" ("status")
    `);

    // Create access_tokens table
    await queryRunner.query(`
      CREATE TABLE "access_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "identifier" character varying NOT NULL,
        "accessToken" character varying NOT NULL,
        "refreshToken" character varying NOT NULL,
        "userId" uuid NOT NULL,
        "deviceIP" character varying,
        "deviceName" character varying,
        "deviceLocation" character varying,
        "expiration" TIMESTAMP NOT NULL,
        "refreshExpiration" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_f20f028607b2603deabd8182d12" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for access tokens
    await queryRunner.query(`
      CREATE INDEX "IDX_access_tokens_user_id" ON "access_tokens" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_access_tokens_access_token" ON "access_tokens" ("accessToken")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_access_tokens_refresh_token" ON "access_tokens" ("refreshToken")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_access_tokens_expiration" ON "access_tokens" ("expiration")
    `);

    // Create reset_password_tokens table
    await queryRunner.query(`
      CREATE TABLE "reset_password_tokens" (
        "email" character varying NOT NULL,
        "reset_token" character varying NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        CONSTRAINT "PK_reset_password_tokens_email" PRIMARY KEY ("email")
      )
    `);

    // Create index on reset token for lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_reset_password_tokens_reset_token" ON "reset_password_tokens" ("reset_token")
    `);

    // Create index on expires_at for cleanup
    await queryRunner.query(`
      CREATE INDEX "IDX_reset_password_tokens_expires_at" ON "reset_password_tokens" ("expires_at")
    `);

    // Create upload_media table
    await queryRunner.query(`
      CREATE TABLE "upload_media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "filename" character varying NOT NULL,
        "path" character varying NOT NULL,
        "url" character varying NOT NULL,
        "mimetype" character varying NOT NULL,
        "size" integer NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" character varying NOT NULL,
        "createdById" uuid,
        "updatedById" uuid,
        "createdAt" TIMESTAMP,
        "updatedAt" TIMESTAMP,
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_upload_media_id" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for upload_media
    await queryRunner.query(`
      CREATE INDEX "IDX_upload_media_entity_type_id" ON "upload_media" ("entityType", "entityId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_upload_media_mimetype" ON "upload_media" ("mimetype")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_upload_media_created_by" ON "upload_media" ("createdById")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_upload_media_deleted_at" ON "upload_media" ("deletedAt")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "access_tokens" ADD CONSTRAINT "FK_access_tokens_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "reset_password_tokens" ADD CONSTRAINT "FK_reset_password_tokens_user" 
      FOREIGN KEY ("email") REFERENCES "users"("email") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "upload_media" ADD CONSTRAINT "FK_upload_media_created_by" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "upload_media" ADD CONSTRAINT "FK_upload_media_updated_by" 
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "upload_media" DROP CONSTRAINT "FK_upload_media_updated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "upload_media" DROP CONSTRAINT "FK_upload_media_created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "reset_password_tokens" DROP CONSTRAINT "FK_reset_password_tokens_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "access_tokens" DROP CONSTRAINT "FK_access_tokens_user"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_upload_media_deleted_at"`);
    await queryRunner.query(`DROP INDEX "IDX_upload_media_created_by"`);
    await queryRunner.query(`DROP INDEX "IDX_upload_media_mimetype"`);
    await queryRunner.query(`DROP INDEX "IDX_upload_media_entity_type_id"`);

    await queryRunner.query(
      `DROP INDEX "IDX_reset_password_tokens_expires_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_reset_password_tokens_reset_token"`,
    );

    await queryRunner.query(`DROP INDEX "IDX_access_tokens_expiration"`);
    await queryRunner.query(`DROP INDEX "IDX_access_tokens_refresh_token"`);
    await queryRunner.query(`DROP INDEX "IDX_access_tokens_access_token"`);
    await queryRunner.query(`DROP INDEX "IDX_access_tokens_user_id"`);

    await queryRunner.query(`DROP INDEX "IDX_users_status"`);
    await queryRunner.query(`DROP INDEX "IDX_users_role"`);
    await queryRunner.query(`DROP INDEX "IDX_users_email"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "upload_media"`);
    await queryRunner.query(`DROP TABLE "reset_password_tokens"`);
    await queryRunner.query(`DROP TABLE "access_tokens"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "user_provider_enum"`);
    await queryRunner.query(`DROP TYPE "user_gender_enum"`);
    await queryRunner.query(`DROP TYPE "user_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
