import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFcmNotifications20260126000000
  implements MigrationInterface
{
  name = "CreateFcmNotifications20260126000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_type enum
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM(
        'ORDER_NEW',
        'ORDER_STATUS_CHANGED',
        'USER_REGISTERED',
        'PAYMENT_SUCCESS',
        'PAYMENT_FAILED',
        'PAYMENT_REFUNDED'
      )
    `);

    // Create admin_fcm_tokens table
    await queryRunner.query(`
      CREATE TABLE "admin_fcm_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "token" character varying(500) NOT NULL,
        "deviceId" character varying(255),
        "deviceType" character varying(100),
        "userAgent" character varying(500),
        "isActive" boolean NOT NULL DEFAULT true,
        "lastUsedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_admin_fcm_tokens" PRIMARY KEY ("id")
      )
    `);

    // Create admin_notifications table
    await queryRunner.query(`
      CREATE TABLE "admin_notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "notification_type_enum" NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "isRead" boolean NOT NULL DEFAULT false,
        "targetUserId" uuid,
        "readAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_admin_notifications" PRIMARY KEY ("id")
      )
    `);

    // Create admin_notification_preferences table
    await queryRunner.query(`
      CREATE TABLE "admin_notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "orderNew" boolean NOT NULL DEFAULT true,
        "orderStatusChanged" boolean NOT NULL DEFAULT true,
        "userRegistered" boolean NOT NULL DEFAULT true,
        "paymentSuccess" boolean NOT NULL DEFAULT true,
        "paymentFailed" boolean NOT NULL DEFAULT true,
        "paymentRefunded" boolean NOT NULL DEFAULT true,
        "pushEnabled" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_admin_notification_preferences" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_notification_preferences_userId" UNIQUE ("userId")
      )
    `);

    // Create indexes for admin_fcm_tokens
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_fcm_tokens_userId" ON "admin_fcm_tokens" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_fcm_tokens_token" ON "admin_fcm_tokens" ("token")
    `);

    // Create indexes for admin_notifications
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notifications_type" ON "admin_notifications" ("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notifications_isRead" ON "admin_notifications" ("isRead")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notifications_targetUserId" ON "admin_notifications" ("targetUserId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_admin_notifications_createdAt" ON "admin_notifications" ("createdAt")
    `);

    // Add foreign key for admin_fcm_tokens.userId
    await queryRunner.query(`
      ALTER TABLE "admin_fcm_tokens"
      ADD CONSTRAINT "FK_admin_fcm_tokens_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);

    // Add foreign key for admin_notifications.targetUserId
    await queryRunner.query(`
      ALTER TABLE "admin_notifications"
      ADD CONSTRAINT "FK_admin_notifications_targetUserId"
      FOREIGN KEY ("targetUserId") REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // Add foreign key for admin_notification_preferences.userId
    await queryRunner.query(`
      ALTER TABLE "admin_notification_preferences"
      ADD CONSTRAINT "FK_admin_notification_preferences_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "admin_notification_preferences" DROP CONSTRAINT "FK_admin_notification_preferences_userId"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_notifications" DROP CONSTRAINT "FK_admin_notifications_targetUserId"
    `);
    await queryRunner.query(`
      ALTER TABLE "admin_fcm_tokens" DROP CONSTRAINT "FK_admin_fcm_tokens_userId"
    `);

    // Drop indexes for admin_notifications
    await queryRunner.query(`DROP INDEX "IDX_admin_notifications_createdAt"`);
    await queryRunner.query(
      `DROP INDEX "IDX_admin_notifications_targetUserId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_admin_notifications_isRead"`);
    await queryRunner.query(`DROP INDEX "IDX_admin_notifications_type"`);

    // Drop indexes for admin_fcm_tokens
    await queryRunner.query(`DROP INDEX "IDX_admin_fcm_tokens_token"`);
    await queryRunner.query(`DROP INDEX "IDX_admin_fcm_tokens_userId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "admin_notification_preferences"`);
    await queryRunner.query(`DROP TABLE "admin_notifications"`);
    await queryRunner.query(`DROP TABLE "admin_fcm_tokens"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
