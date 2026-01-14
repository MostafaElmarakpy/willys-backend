import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBranchMenuOverrides20260111121100
  implements MigrationInterface
{
  name = "CreateBranchMenuOverrides20260111121100";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create branch_category_overrides table
    await queryRunner.query(`
      CREATE TABLE "branch_category_overrides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "branchId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "reason" text,
        "createdById" uuid,
        "updatedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_branch_category_overrides" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_category_overrides_branch_category" UNIQUE ("branchId", "categoryId")
      )
    `);

    // Create indexes for branch_category_overrides
    await queryRunner.query(`
      CREATE INDEX "IDX_branch_category_overrides_branch_available"
      ON "branch_category_overrides" ("branchId", "isAvailable")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_branch_category_overrides_category"
      ON "branch_category_overrides" ("categoryId")
    `);

    // Add foreign key constraints for branch_category_overrides
    await queryRunner.query(`
      ALTER TABLE "branch_category_overrides"
      ADD CONSTRAINT "FK_branch_category_overrides_branch"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_category_overrides"
      ADD CONSTRAINT "FK_branch_category_overrides_category"
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_category_overrides"
      ADD CONSTRAINT "FK_branch_category_overrides_created_by"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_category_overrides"
      ADD CONSTRAINT "FK_branch_category_overrides_updated_by"
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Create branch_item_overrides table
    await queryRunner.query(`
      CREATE TABLE "branch_item_overrides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "branchId" uuid NOT NULL,
        "itemId" uuid NOT NULL,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "reason" text,
        "createdById" uuid,
        "updatedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_branch_item_overrides" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_item_overrides_branch_item" UNIQUE ("branchId", "itemId")
      )
    `);

    // Create indexes for branch_item_overrides
    await queryRunner.query(`
      CREATE INDEX "IDX_branch_item_overrides_branch_available"
      ON "branch_item_overrides" ("branchId", "isAvailable")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_branch_item_overrides_item"
      ON "branch_item_overrides" ("itemId")
    `);

    // Add foreign key constraints for branch_item_overrides
    await queryRunner.query(`
      ALTER TABLE "branch_item_overrides"
      ADD CONSTRAINT "FK_branch_item_overrides_branch"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_item_overrides"
      ADD CONSTRAINT "FK_branch_item_overrides_item"
      FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_item_overrides"
      ADD CONSTRAINT "FK_branch_item_overrides_created_by"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_item_overrides"
      ADD CONSTRAINT "FK_branch_item_overrides_updated_by"
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Create branch_bundle_overrides table
    await queryRunner.query(`
      CREATE TABLE "branch_bundle_overrides" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "branchId" uuid NOT NULL,
        "bundleId" uuid NOT NULL,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "reason" text,
        "createdById" uuid,
        "updatedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_branch_bundle_overrides" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_branch_bundle_overrides_branch_bundle" UNIQUE ("branchId", "bundleId")
      )
    `);

    // Create indexes for branch_bundle_overrides
    await queryRunner.query(`
      CREATE INDEX "IDX_branch_bundle_overrides_branch_available"
      ON "branch_bundle_overrides" ("branchId", "isAvailable")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_branch_bundle_overrides_bundle"
      ON "branch_bundle_overrides" ("bundleId")
    `);

    // Add foreign key constraints for branch_bundle_overrides
    await queryRunner.query(`
      ALTER TABLE "branch_bundle_overrides"
      ADD CONSTRAINT "FK_branch_bundle_overrides_branch"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_bundle_overrides"
      ADD CONSTRAINT "FK_branch_bundle_overrides_bundle"
      FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_bundle_overrides"
      ADD CONSTRAINT "FK_branch_bundle_overrides_created_by"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_bundle_overrides"
      ADD CONSTRAINT "FK_branch_bundle_overrides_updated_by"
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop branch_bundle_overrides table
    await queryRunner.query(`
      ALTER TABLE "branch_bundle_overrides" DROP CONSTRAINT "FK_branch_bundle_overrides_updated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_bundle_overrides" DROP CONSTRAINT "FK_branch_bundle_overrides_created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_bundle_overrides" DROP CONSTRAINT "FK_branch_bundle_overrides_bundle"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_bundle_overrides" DROP CONSTRAINT "FK_branch_bundle_overrides_branch"
    `);

    await queryRunner.query(`DROP INDEX "IDX_branch_bundle_overrides_bundle"`);
    await queryRunner.query(
      `DROP INDEX "IDX_branch_bundle_overrides_branch_available"`,
    );
    await queryRunner.query(`DROP TABLE "branch_bundle_overrides"`);

    // Drop branch_item_overrides table
    await queryRunner.query(`
      ALTER TABLE "branch_item_overrides" DROP CONSTRAINT "FK_branch_item_overrides_updated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_item_overrides" DROP CONSTRAINT "FK_branch_item_overrides_created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_item_overrides" DROP CONSTRAINT "FK_branch_item_overrides_item"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_item_overrides" DROP CONSTRAINT "FK_branch_item_overrides_branch"
    `);

    await queryRunner.query(`DROP INDEX "IDX_branch_item_overrides_item"`);
    await queryRunner.query(
      `DROP INDEX "IDX_branch_item_overrides_branch_available"`,
    );
    await queryRunner.query(`DROP TABLE "branch_item_overrides"`);

    // Drop branch_category_overrides table
    await queryRunner.query(`
      ALTER TABLE "branch_category_overrides" DROP CONSTRAINT "FK_branch_category_overrides_updated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_category_overrides" DROP CONSTRAINT "FK_branch_category_overrides_created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_category_overrides" DROP CONSTRAINT "FK_branch_category_overrides_category"
    `);

    await queryRunner.query(`
      ALTER TABLE "branch_category_overrides" DROP CONSTRAINT "FK_branch_category_overrides_branch"
    `);

    await queryRunner.query(
      `DROP INDEX "IDX_branch_category_overrides_category"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_branch_category_overrides_branch_available"`,
    );
    await queryRunner.query(`DROP TABLE "branch_category_overrides"`);
  }
}
