import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRbacSystem20260111121400 implements MigrationInterface {
  name = "CreateRbacSystem20260111121400";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "displayName" character varying,
        "description" text,
        "permissions" jsonb NOT NULL DEFAULT '{}',
        "isSystemRole" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name")
      )
    `);

    // Create indexes for roles table
    await queryRunner.query(`
      CREATE INDEX "IDX_roles_name" ON "roles" ("name")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_roles_isActive" ON "roles" ("isActive")
    `);

    // Add adminRoleId column to users table
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "adminRoleId" uuid
    `);

    // Create index on users.adminRoleId
    await queryRunner.query(`
      CREATE INDEX "IDX_users_adminRoleId" ON "users" ("adminRoleId")
    `);

    // Create foreign key
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_adminRoleId"
      FOREIGN KEY ("adminRoleId") REFERENCES "roles"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Insert predefined roles
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "displayName", "description", "permissions", "isSystemRole", "isActive")
      VALUES
        (
          'SUPER_ADMIN',
          'Super Admin',
          'Full system access with all permissions',
          '{"USERS": ["CREATE", "READ", "UPDATE", "DELETE"], "CATEGORIES": ["CREATE", "READ", "UPDATE", "DELETE"], "ITEMS": ["CREATE", "READ", "UPDATE", "DELETE", "DUPLICATE", "ARCHIVE"], "BUNDLES": ["CREATE", "READ", "UPDATE", "DELETE", "DUPLICATE", "ARCHIVE"], "INGREDIENTS": ["CREATE", "READ", "UPDATE", "DELETE"], "BRANCHES": ["CREATE", "READ", "UPDATE", "DELETE", "TOGGLE_STATUS", "VIEW_STATS"], "ZONES": ["CREATE", "READ", "UPDATE", "DELETE", "TOGGLE_STATUS", "VIEW_STATS"], "BRANCH_MENU": ["READ", "UPDATE", "DELETE", "BULK_UPDATE"], "DISCOUNTS": ["CREATE", "READ", "UPDATE", "DELETE", "DUPLICATE", "ASSIGN", "TOGGLE_STATUS"], "PAYMENTS": ["READ", "VIEW_STATS"], "REFUNDS": ["READ", "APPROVE", "REJECT"], "ROLES": ["CREATE", "READ", "UPDATE", "DELETE", "ASSIGN"]}',
          true,
          true
        ),
        (
          'MANAGER',
          'Manager',
          'Management access - most features except user management and roles',
          '{"CATEGORIES": ["CREATE", "READ", "UPDATE", "DELETE"], "ITEMS": ["CREATE", "READ", "UPDATE", "DELETE", "DUPLICATE", "ARCHIVE"], "BUNDLES": ["CREATE", "READ", "UPDATE", "DELETE", "DUPLICATE", "ARCHIVE"], "INGREDIENTS": ["CREATE", "READ", "UPDATE", "DELETE"], "BRANCHES": ["READ", "UPDATE", "TOGGLE_STATUS", "VIEW_STATS"], "ZONES": ["READ", "UPDATE", "TOGGLE_STATUS", "VIEW_STATS"], "BRANCH_MENU": ["READ", "UPDATE", "BULK_UPDATE"], "DISCOUNTS": ["CREATE", "READ", "UPDATE", "DELETE", "DUPLICATE", "ASSIGN", "TOGGLE_STATUS"], "PAYMENTS": ["READ", "VIEW_STATS"], "REFUNDS": ["READ"]}',
          true,
          true
        ),
        (
          'STAFF',
          'Staff',
          'Basic staff access - read-only with limited actions',
          '{"CATEGORIES": ["READ"], "ITEMS": ["READ"], "BUNDLES": ["READ"], "INGREDIENTS": ["READ"], "BRANCHES": ["READ"], "ZONES": ["READ"], "BRANCH_MENU": ["READ", "UPDATE"], "DISCOUNTS": ["READ"], "PAYMENTS": ["READ"]}',
          true,
          true
        ),
        (
          'CASHIER',
          'Cashier',
          'Point of sale access - payments and menu viewing',
          '{"CATEGORIES": ["READ"], "ITEMS": ["READ"], "BUNDLES": ["READ"], "DISCOUNTS": ["READ"], "PAYMENTS": ["READ", "VIEW_STATS"], "REFUNDS": ["READ"]}',
          true,
          true
        )
    `);

    // Migrate existing ADMIN users to SUPER_ADMIN role
    await queryRunner.query(`
      UPDATE "users"
      SET "adminRoleId" = (SELECT "id" FROM "roles" WHERE "name" = 'SUPER_ADMIN')
      WHERE "role" = 'ADMIN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "FK_users_adminRoleId"
    `);

    // Remove index
    await queryRunner.query(`DROP INDEX "IDX_users_adminRoleId"`);

    // Remove adminRoleId column
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "adminRoleId"
    `);

    // Drop roles table indexes
    await queryRunner.query(`DROP INDEX "IDX_roles_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_roles_name"`);

    // Drop roles table
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}
