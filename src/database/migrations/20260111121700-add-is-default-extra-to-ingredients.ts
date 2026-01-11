import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDefaultExtraToIngredients20260111121700 implements MigrationInterface {
  name = 'AddIsDefaultExtraToIngredients20260111121700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isDefaultExtra column to ingredients table
    await queryRunner.query(`
      ALTER TABLE "ingredients" 
      ADD COLUMN "isDefaultExtra" boolean NOT NULL DEFAULT false
    `);

    // Create index for better performance when querying default extras
    await queryRunner.query(`
      CREATE INDEX "IDX_ingredients_isDefaultExtra" ON "ingredients" ("isDefaultExtra")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_ingredients_isDefaultExtra"`);

    // Remove column from ingredients
    await queryRunner.query(
      `ALTER TABLE "ingredients" DROP COLUMN "isDefaultExtra"`,
    );
  }
}
