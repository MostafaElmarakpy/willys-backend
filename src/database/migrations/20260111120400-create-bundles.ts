import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBundles20260111120400 implements MigrationInterface {
  name = 'CreateBundles20260111120400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create bundle_status_enum type
    await queryRunner.query(`
      CREATE TYPE "bundle_status_enum" AS ENUM('active', 'draft', 'archived')
    `);

    // Create bundles table
    await queryRunner.query(`
      CREATE TABLE "bundles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "description" jsonb,
        "image" character varying,
        "categoryId" uuid NOT NULL,
        "numberOfItems" integer NOT NULL DEFAULT 0,
        "price" numeric(10,2) NOT NULL,
        "status" "bundle_status_enum" NOT NULL DEFAULT 'draft',
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bundles" PRIMARY KEY ("id")
      )
    `);

    // Create bundle_items junction table
    await queryRunner.query(`
      CREATE TABLE "bundle_items" (
        "bundleId" uuid NOT NULL,
        "itemId" uuid NOT NULL,
        CONSTRAINT "PK_bundle_items" PRIMARY KEY ("bundleId", "itemId")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_bundles_categoryId" ON "bundles" ("categoryId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundles_status" ON "bundles" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_items_bundleId" ON "bundle_items" ("bundleId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_items_itemId" ON "bundle_items" ("itemId")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "bundles" 
      ADD CONSTRAINT "FK_bundles_categoryId" 
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bundles" 
      ADD CONSTRAINT "FK_bundles_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bundles" 
      ADD CONSTRAINT "FK_bundles_updatedBy" 
      FOREIGN KEY ("updatedBy") REFERENCES "users"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bundle_items" 
      ADD CONSTRAINT "FK_bundle_items_bundleId" 
      FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bundle_items" 
      ADD CONSTRAINT "FK_bundle_items_itemId" 
      FOREIGN KEY ("itemId") REFERENCES "items"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "bundle_items" DROP CONSTRAINT "FK_bundle_items_itemId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_items" DROP CONSTRAINT "FK_bundle_items_bundleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bundles" DROP CONSTRAINT "FK_bundles_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bundles" DROP CONSTRAINT "FK_bundles_createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bundles" DROP CONSTRAINT "FK_bundles_categoryId"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_bundle_items_itemId"`);
    await queryRunner.query(`DROP INDEX "IDX_bundle_items_bundleId"`);
    await queryRunner.query(`DROP INDEX "IDX_bundles_status"`);
    await queryRunner.query(`DROP INDEX "IDX_bundles_categoryId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "bundle_items"`);
    await queryRunner.query(`DROP TABLE "bundles"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "bundle_status_enum"`);
  }
}
