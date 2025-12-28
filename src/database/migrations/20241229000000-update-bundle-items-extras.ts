import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBundleItemsExtras20241229000000
  implements MigrationInterface
{
  name = 'UpdateBundleItemsExtras20241229000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add items JSONB column to bundles table
    await queryRunner.query(`
      ALTER TABLE "bundles"
      ADD COLUMN "items" jsonb
    `);

    // Add extras JSONB column to bundles table
    await queryRunner.query(`
      ALTER TABLE "bundles"
      ADD COLUMN "extras" jsonb
    `);

    // Migrate existing data from bundle_items junction table to items JSONB column
    await queryRunner.query(`
      UPDATE bundles b
      SET items = (
        SELECT jsonb_agg(jsonb_build_object('id', bi."itemId"::text, 'quantity', '1'))
        FROM bundle_items bi
        WHERE bi."bundleId" = b.id
      )
      WHERE EXISTS (SELECT 1 FROM bundle_items bi WHERE bi."bundleId" = b.id)
    `);

    // Drop foreign key constraints from bundle_items table
    await queryRunner.query(`
      ALTER TABLE "bundle_items"
      DROP CONSTRAINT "FK_bundle_items_itemId"
    `);

    await queryRunner.query(`
      ALTER TABLE "bundle_items"
      DROP CONSTRAINT "FK_bundle_items_bundleId"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_bundle_items_itemId"`);
    await queryRunner.query(`DROP INDEX "IDX_bundle_items_bundleId"`);

    // Drop bundle_items junction table
    await queryRunner.query(`DROP TABLE "bundle_items"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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

    // Migrate data back from JSONB to junction table
    await queryRunner.query(`
      INSERT INTO bundle_items ("bundleId", "itemId")
      SELECT
        b.id as "bundleId",
        (item->>'id')::uuid as "itemId"
      FROM bundles b
      CROSS JOIN jsonb_array_elements(b.items) as item
      WHERE b.items IS NOT NULL
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

    // Drop items and extras columns from bundles table
    await queryRunner.query(`
      ALTER TABLE "bundles"
      DROP COLUMN "items"
    `);

    await queryRunner.query(`
      ALTER TABLE "bundles"
      DROP COLUMN "extras"
    `);
  }
}
