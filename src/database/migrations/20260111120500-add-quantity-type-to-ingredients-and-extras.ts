import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuantityTypeToIngredientsAndExtras20260111120500
  implements MigrationInterface
{
  name = "AddQuantityTypeToIngredientsAndExtras20260111120500";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create quantity_type enum
    await queryRunner.query(`
      CREATE TYPE "quantity_type_enum" AS ENUM(
        'piece', 'slice', 'scoop', 'dash', 'pinch', 'splash', 
        'drizzle', 'handful', 'sprinkle', 'layer', 'pump', 
        'shot', 'cup', 'spoon', 'portion'
      )
    `);

    // Add quantityType column to ingredients table
    await queryRunner.query(`
      ALTER TABLE "ingredients" 
      ADD COLUMN "quantityType" "quantity_type_enum" NOT NULL DEFAULT 'piece'
    `);

    // Add quantity and quantityType columns to variant_values table (for extras)
    await queryRunner.query(`
      ALTER TABLE "variant_values" 
      ADD COLUMN "quantity" numeric(10,2)
    `);

    await queryRunner.query(`
      ALTER TABLE "variant_values" 
      ADD COLUMN "quantityType" "quantity_type_enum"
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_ingredients_quantityType" ON "ingredients" ("quantityType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_variant_values_quantityType" ON "variant_values" ("quantityType")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_variant_values_quantityType"`);
    await queryRunner.query(`DROP INDEX "IDX_ingredients_quantityType"`);

    // Remove columns from variant_values
    await queryRunner.query(
      `ALTER TABLE "variant_values" DROP COLUMN "quantityType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "variant_values" DROP COLUMN "quantity"`,
    );

    // Remove column from ingredients
    await queryRunner.query(
      `ALTER TABLE "ingredients" DROP COLUMN "quantityType"`,
    );

    // Drop enum type
    await queryRunner.query(`DROP TYPE "quantity_type_enum"`);
  }
}
