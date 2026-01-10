import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class UpdateItemPricingAndFields20260111120600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns for pricing, tags, extras, and ingredientsWithQuantity
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'pricing',
        type: 'jsonb',
        isNullable: false,
        default: "'0'::jsonb",
      }),
    );

    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'tags',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'extras',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'ingredientsWithQuantity',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // Migrate existing price data to pricing field
    await queryRunner.query(`
      UPDATE items
      SET pricing = price::numeric::text::jsonb
      WHERE price IS NOT NULL
    `);

    // Drop the old price column
    await queryRunner.dropColumn('items', 'price');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the price column
    await queryRunner.addColumn(
      'items',
      new TableColumn({
        name: 'price',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: false,
        default: 0,
      }),
    );

    // Migrate pricing data back to price (only for numeric values)
    await queryRunner.query(`
      UPDATE items
      SET price = CASE
        WHEN jsonb_typeof(pricing) = 'number' THEN (pricing::text)::numeric
        ELSE 0
      END
    `);

    // Drop the new columns
    await queryRunner.dropColumn('items', 'pricing');
    await queryRunner.dropColumn('items', 'tags');
    await queryRunner.dropColumn('items', 'extras');
    await queryRunner.dropColumn('items', 'ingredientsWithQuantity');
  }
}
