import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimestampsToDiscountJunctionTables20260118000000
  implements MigrationInterface
{
  name = "AddTimestampsToDiscountJunctionTables20260118000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add createdAt and updatedAt columns to user_discounts table
    await queryRunner.query(`
      ALTER TABLE "user_discounts" 
      ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "user_discounts" 
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Add createdAt and updatedAt columns to item_discounts table
    await queryRunner.query(`
      ALTER TABLE "item_discounts" 
      ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    await queryRunner.query(`
      ALTER TABLE "item_discounts" 
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Create indexes on timestamp columns for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_user_discounts_createdAt" ON "user_discounts" ("createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_discounts_updatedAt" ON "user_discounts" ("updatedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_item_discounts_createdAt" ON "item_discounts" ("createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_item_discounts_updatedAt" ON "item_discounts" ("updatedAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX "IDX_user_discounts_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_user_discounts_updatedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_item_discounts_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_item_discounts_updatedAt"`);

    // Drop columns
    await queryRunner.query(
      `ALTER TABLE "user_discounts" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_discounts" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_discounts" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_discounts" DROP COLUMN "updatedAt"`,
    );
  }
}
