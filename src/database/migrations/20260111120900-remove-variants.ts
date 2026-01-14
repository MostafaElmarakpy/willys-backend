import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveVariants20260111120900 implements MigrationInterface {
  name = "RemoveVariants20260111120900";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the item_variants junction table first (foreign key dependencies)
    await queryRunner.query(`DROP TABLE IF EXISTS "item_variants"`);

    // Drop the variant_values table (depends on variants)
    await queryRunner.query(`DROP TABLE IF EXISTS "variant_values"`);

    // Drop the variants table
    await queryRunner.query(`DROP TABLE IF EXISTS "variants"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate variants table
    await queryRunner.query(`
      CREATE TABLE "variants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" jsonb NOT NULL,
        "type" character varying NOT NULL DEFAULT 'default',
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_variants" PRIMARY KEY ("id")
      )
    `);

    // Add indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_variants_type" ON "variants" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variants_isActive" ON "variants" ("isActive")`,
    );

    // Recreate variant_values table
    await queryRunner.query(`
      CREATE TABLE "variant_values" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" jsonb NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "quantity" numeric(10,2),
        "quantityType" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "variantId" uuid NOT NULL,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_variant_values" PRIMARY KEY ("id")
      )
    `);

    // Add indexes for variant_values
    await queryRunner.query(
      `CREATE INDEX "IDX_variant_values_quantityType" ON "variant_values" ("quantityType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variant_values_isActive" ON "variant_values" ("isActive")`,
    );

    // Recreate item_variants junction table
    await queryRunner.query(`
      CREATE TABLE "item_variants" (
        "itemId" uuid NOT NULL,
        "variantId" uuid NOT NULL,
        CONSTRAINT "PK_item_variants" PRIMARY KEY ("itemId", "variantId")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "variants" 
      ADD CONSTRAINT "FK_variants_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variants" 
      ADD CONSTRAINT "FK_variants_updatedBy" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variant_values" 
      ADD CONSTRAINT "FK_variant_values_variantId" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variant_values" 
      ADD CONSTRAINT "FK_variant_values_createdBy" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variant_values" 
      ADD CONSTRAINT "FK_variant_values_updatedBy" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "item_variants" 
      ADD CONSTRAINT "FK_item_variants_itemId" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "item_variants" 
      ADD CONSTRAINT "FK_item_variants_variantId" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Add indexes for junction table
    await queryRunner.query(
      `CREATE INDEX "IDX_item_variants_itemId" ON "item_variants" ("itemId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_item_variants_variantId" ON "item_variants" ("variantId")`,
    );
  }
}
