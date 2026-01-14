import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSoftDeleteColumns20260111121000 implements MigrationInterface {
  name = "AddSoftDeleteColumns20260111121000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deletedAt column to access_tokens table
    await queryRunner.query(`
      ALTER TABLE "access_tokens" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to branches table
    await queryRunner.query(`
      ALTER TABLE "branches" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to zones table
    await queryRunner.query(`
      ALTER TABLE "zones" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to categories table
    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to ingredient_categories table
    await queryRunner.query(`
      ALTER TABLE "ingredient_categories" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to ingredients table
    await queryRunner.query(`
      ALTER TABLE "ingredients" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to items table
    await queryRunner.query(`
      ALTER TABLE "items" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to bundles table
    await queryRunner.query(`
      ALTER TABLE "bundles" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to discounts table
    await queryRunner.query(`
      ALTER TABLE "discounts" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Add deletedAt column to discount_usage_logs table
    await queryRunner.query(`
      ALTER TABLE "discount_usage_logs" 
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Convert user_discounts to use BaseEntity structure (add id column, make userId/discountId regular columns)
    await queryRunner.query(`
      ALTER TABLE "user_discounts"
      ADD COLUMN "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Drop old primary key constraint and create new one with id
    await queryRunner.query(`
      ALTER TABLE "user_discounts" DROP CONSTRAINT "PK_user_discounts"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_discounts" ADD CONSTRAINT "PK_user_discounts" PRIMARY KEY ("id")
    `);

    // Convert item_discounts to use BaseEntity structure (add id column, make itemId/discountId regular columns)
    await queryRunner.query(`
      ALTER TABLE "item_discounts" 
      ADD COLUMN "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      ADD COLUMN "deletedAt" TIMESTAMP NULL
    `);

    // Drop old primary key constraint and create new one with id
    await queryRunner.query(`
      ALTER TABLE "item_discounts" DROP CONSTRAINT "PK_item_discounts"
    `);

    await queryRunner.query(`
      ALTER TABLE "item_discounts" ADD CONSTRAINT "PK_item_discounts" PRIMARY KEY ("id")
    `);

    // Create indexes on deletedAt columns for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_access_tokens_deletedAt" ON "access_tokens" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_branches_deletedAt" ON "branches" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_zones_deletedAt" ON "zones" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_categories_deletedAt" ON "categories" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ingredient_categories_deletedAt" ON "ingredient_categories" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ingredients_deletedAt" ON "ingredients" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_items_deletedAt" ON "items" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_bundles_deletedAt" ON "bundles" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discounts_deletedAt" ON "discounts" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discount_usage_logs_deletedAt" ON "discount_usage_logs" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_discounts_deletedAt" ON "user_discounts" ("deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_item_discounts_deletedAt" ON "item_discounts" ("deletedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "IDX_access_tokens_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_branches_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_zones_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_categories_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_ingredient_categories_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_ingredients_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_items_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_bundles_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_discounts_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_discount_usage_logs_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_user_discounts_deletedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_item_discounts_deletedAt"`);

    // Drop deletedAt columns
    await queryRunner.query(
      `ALTER TABLE "access_tokens" DROP COLUMN "deletedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "zones" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "deletedAt"`);
    await queryRunner.query(
      `ALTER TABLE "ingredient_categories" DROP COLUMN "deletedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ingredients" DROP COLUMN "deletedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "items" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "bundles" DROP COLUMN "deletedAt"`);
    await queryRunner.query(`ALTER TABLE "discounts" DROP COLUMN "deletedAt"`);
    await queryRunner.query(
      `ALTER TABLE "discount_usage_logs" DROP COLUMN "deletedAt"`,
    );

    // Revert junction tables back to composite primary keys
    await queryRunner.query(`
      ALTER TABLE "user_discounts" DROP CONSTRAINT "PK_user_discounts"
    `);

    await queryRunner.query(`
      ALTER TABLE "user_discounts" ADD CONSTRAINT "PK_user_discounts" PRIMARY KEY ("userId", "discountId")
    `);

    await queryRunner.query(`
      ALTER TABLE "user_discounts" 
      DROP COLUMN "deletedAt",
      DROP COLUMN "updatedAt",
      DROP COLUMN "createdAt",
      DROP COLUMN "id"
    `);

    await queryRunner.query(`
      ALTER TABLE "item_discounts" DROP CONSTRAINT "PK_item_discounts"
    `);

    await queryRunner.query(`
      ALTER TABLE "item_discounts" ADD CONSTRAINT "PK_item_discounts" PRIMARY KEY ("itemId", "discountId")
    `);

    await queryRunner.query(`
      ALTER TABLE "item_discounts" 
      DROP COLUMN "deletedAt",
      DROP COLUMN "updatedAt",
      DROP COLUMN "createdAt",
      DROP COLUMN "id"
    `);
  }
}
