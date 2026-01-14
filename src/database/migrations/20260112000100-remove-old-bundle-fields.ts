import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveOldBundleFields20260112000100 implements MigrationInterface {
  name = "RemoveOldBundleFields20260112000100";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if items column exists before dropping
    const hasItemsColumn = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='bundles' AND column_name='items'
    `);

    if (hasItemsColumn.length > 0) {
      await queryRunner.query(`ALTER TABLE "bundles" DROP COLUMN "items"`);
    }

    // Check if numberOfItems column exists before dropping
    const hasNumberOfItemsColumn = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='bundles' AND column_name='numberOfItems'
    `);

    if (hasNumberOfItemsColumn.length > 0) {
      await queryRunner.query(
        `ALTER TABLE "bundles" DROP COLUMN "numberOfItems"`,
      );
    }

    // Drop bundle_items junction table if it exists
    const hasBundleItemsTable = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name='bundle_items'
    `);

    if (hasBundleItemsTable.length > 0) {
      // Drop foreign keys first
      await queryRunner.query(
        `ALTER TABLE "bundle_items" DROP CONSTRAINT IF EXISTS "FK_bundle_items_itemId"`,
      );
      await queryRunner.query(
        `ALTER TABLE "bundle_items" DROP CONSTRAINT IF EXISTS "FK_bundle_items_bundleId"`,
      );

      // Drop indexes
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bundle_items_itemId"`);
      await queryRunner.query(
        `DROP INDEX IF EXISTS "IDX_bundle_items_bundleId"`,
      );

      // Drop table
      await queryRunner.query(`DROP TABLE "bundle_items"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore numberOfItems column
    await queryRunner.query(`
      ALTER TABLE "bundles" ADD "numberOfItems" integer NOT NULL DEFAULT 0
    `);

    // Restore items column
    await queryRunner.query(`
      ALTER TABLE "bundles" ADD "items" jsonb
    `);

    // Recreate bundle_items junction table
    await queryRunner.query(`
      CREATE TABLE "bundle_items" (
        "bundleId" uuid NOT NULL,
        "itemId" uuid NOT NULL,
        CONSTRAINT "PK_bundle_items" PRIMARY KEY ("bundleId", "itemId")
      )
    `);

    // Recreate indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_items_bundleId" ON "bundle_items" ("bundleId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_items_itemId" ON "bundle_items" ("itemId")
    `);

    // Recreate foreign key constraints
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
}
