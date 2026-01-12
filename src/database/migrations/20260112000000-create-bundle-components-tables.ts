import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBundleComponentsTables20260112000000 implements MigrationInterface {
  name = 'CreateBundleComponentsTables20260112000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create bundle_components table
    await queryRunner.query(`
      CREATE TABLE "bundle_components" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "bundleId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        "defaultItemId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_bundle_components" PRIMARY KEY ("id")
      )
    `);

    // Create bundle_component_items table
    await queryRunner.query(`
      CREATE TABLE "bundle_component_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "componentId" uuid NOT NULL,
        "itemId" uuid NOT NULL,
        "extraCost" numeric(10,2) NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_bundle_component_items" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_components_bundleId" ON "bundle_components" ("bundleId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_components_categoryId" ON "bundle_components" ("categoryId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_components_defaultItemId" ON "bundle_components" ("defaultItemId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_component_items_componentId" ON "bundle_component_items" ("componentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundle_component_items_itemId" ON "bundle_component_items" ("itemId")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "bundle_components" 
      ADD CONSTRAINT "FK_bundle_components_bundleId" 
      FOREIGN KEY ("bundleId") REFERENCES "bundles"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bundle_components" 
      ADD CONSTRAINT "FK_bundle_components_categoryId" 
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bundle_components" 
      ADD CONSTRAINT "FK_bundle_components_defaultItemId" 
      FOREIGN KEY ("defaultItemId") REFERENCES "items"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bundle_component_items" 
      ADD CONSTRAINT "FK_bundle_component_items_componentId" 
      FOREIGN KEY ("componentId") REFERENCES "bundle_components"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "bundle_component_items" 
      ADD CONSTRAINT "FK_bundle_component_items_itemId" 
      FOREIGN KEY ("itemId") REFERENCES "items"("id") 
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "bundle_component_items" DROP CONSTRAINT "FK_bundle_component_items_itemId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_component_items" DROP CONSTRAINT "FK_bundle_component_items_componentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_components" DROP CONSTRAINT "FK_bundle_components_defaultItemId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_components" DROP CONSTRAINT "FK_bundle_components_categoryId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_components" DROP CONSTRAINT "FK_bundle_components_bundleId"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_bundle_component_items_itemId"`);
    await queryRunner.query(
      `DROP INDEX "IDX_bundle_component_items_componentId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_bundle_components_defaultItemId"`);
    await queryRunner.query(`DROP INDEX "IDX_bundle_components_categoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_bundle_components_bundleId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "bundle_component_items"`);
    await queryRunner.query(`DROP TABLE "bundle_components"`);
  }
}
