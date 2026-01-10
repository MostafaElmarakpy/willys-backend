import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMenuModule20260111120300 implements MigrationInterface {
  name = 'CreateMenuModule20260111120300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "item_status_enum" AS ENUM('active', 'draft', 'archived')
    `);

    await queryRunner.query(`
      CREATE TYPE "variant_type_enum" AS ENUM('default', 'extra')
    `);

    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "description" jsonb,
        "image" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    // Create ingredient_categories table
    await queryRunner.query(`
      CREATE TABLE "ingredient_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "description" jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ingredient_categories" PRIMARY KEY ("id")
      )
    `);

    // Create ingredients table
    await queryRunner.query(`
      CREATE TABLE "ingredients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "quantity" numeric(10,2) NOT NULL,
        "isOptional" boolean NOT NULL DEFAULT false,
        "stockPercentage" numeric(5,2) NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "categoryId" uuid NOT NULL,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ingredients" PRIMARY KEY ("id")
      )
    `);

    // Create variants table
    await queryRunner.query(`
      CREATE TABLE "variants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "type" "variant_type_enum" NOT NULL DEFAULT 'default',
        "isActive" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_variants" PRIMARY KEY ("id")
      )
    `);

    // Create variant_values table
    await queryRunner.query(`
      CREATE TABLE "variant_values" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "price" numeric(10,2) NOT NULL,
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

    // Create items table
    await queryRunner.query(`
      CREATE TABLE "items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "description" jsonb,
        "image" character varying,
        "price" numeric(10,2) NOT NULL,
        "status" "item_status_enum" NOT NULL DEFAULT 'draft',
        "sortOrder" integer NOT NULL DEFAULT 0,
        "categoryId" uuid NOT NULL,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_items" PRIMARY KEY ("id")
      )
    `);

    // Create junction tables
    await queryRunner.query(`
      CREATE TABLE "item_variants" (
        "itemId" uuid NOT NULL,
        "variantId" uuid NOT NULL,
        CONSTRAINT "PK_item_variants" PRIMARY KEY ("itemId", "variantId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "item_ingredients" (
        "itemId" uuid NOT NULL,
        "ingredientId" uuid NOT NULL,
        CONSTRAINT "PK_item_ingredients" PRIMARY KEY ("itemId", "ingredientId")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD CONSTRAINT "FK_categories_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD CONSTRAINT "FK_categories_updatedBy" 
      FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ingredient_categories" 
      ADD CONSTRAINT "FK_ingredient_categories_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ingredient_categories" 
      ADD CONSTRAINT "FK_ingredient_categories_updatedBy" 
      FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ingredients" 
      ADD CONSTRAINT "FK_ingredients_category" 
      FOREIGN KEY ("categoryId") REFERENCES "ingredient_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ingredients" 
      ADD CONSTRAINT "FK_ingredients_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "ingredients" 
      ADD CONSTRAINT "FK_ingredients_updatedBy" 
      FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variants" 
      ADD CONSTRAINT "FK_variants_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variants" 
      ADD CONSTRAINT "FK_variants_updatedBy" 
      FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variant_values" 
      ADD CONSTRAINT "FK_variant_values_variant" 
      FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variant_values" 
      ADD CONSTRAINT "FK_variant_values_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "variant_values" 
      ADD CONSTRAINT "FK_variant_values_updatedBy" 
      FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "items" 
      ADD CONSTRAINT "FK_items_category" 
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "items" 
      ADD CONSTRAINT "FK_items_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "items" 
      ADD CONSTRAINT "FK_items_updatedBy" 
      FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "item_variants" 
      ADD CONSTRAINT "FK_item_variants_item" 
      FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "item_variants" 
      ADD CONSTRAINT "FK_item_variants_variant" 
      FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "item_ingredients" 
      ADD CONSTRAINT "FK_item_ingredients_item" 
      FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "item_ingredients" 
      ADD CONSTRAINT "FK_item_ingredients_ingredient" 
      FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_categories_isActive" ON "categories" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ingredients_isOptional" ON "ingredients" ("isOptional")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ingredients_isActive" ON "ingredients" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ingredients_categoryId" ON "ingredients" ("categoryId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variants_type" ON "variants" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variants_isActive" ON "variants" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_variant_values_isActive" ON "variant_values" ("isActive")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_status" ON "items" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_items_categoryId" ON "items" ("categoryId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_items_categoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_items_status"`);
    await queryRunner.query(`DROP INDEX "IDX_variant_values_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_variants_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_variants_type"`);
    await queryRunner.query(`DROP INDEX "IDX_ingredients_categoryId"`);
    await queryRunner.query(`DROP INDEX "IDX_ingredients_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_ingredients_isOptional"`);
    await queryRunner.query(`DROP INDEX "IDX_categories_isActive"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "item_ingredients" DROP CONSTRAINT "FK_item_ingredients_ingredient"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_ingredients" DROP CONSTRAINT "FK_item_ingredients_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_variants" DROP CONSTRAINT "FK_item_variants_variant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_variants" DROP CONSTRAINT "FK_item_variants_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_items_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_items_createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "items" DROP CONSTRAINT "FK_items_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "variant_values" DROP CONSTRAINT "FK_variant_values_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "variant_values" DROP CONSTRAINT "FK_variant_values_createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "variant_values" DROP CONSTRAINT "FK_variant_values_variant"`,
    );
    await queryRunner.query(
      `ALTER TABLE "variants" DROP CONSTRAINT "FK_variants_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "variants" DROP CONSTRAINT "FK_variants_createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ingredients" DROP CONSTRAINT "FK_ingredients_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ingredients" DROP CONSTRAINT "FK_ingredients_createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ingredients" DROP CONSTRAINT "FK_ingredients_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ingredient_categories" DROP CONSTRAINT "FK_ingredient_categories_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ingredient_categories" DROP CONSTRAINT "FK_ingredient_categories_createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_categories_createdBy"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "item_ingredients"`);
    await queryRunner.query(`DROP TABLE "item_variants"`);
    await queryRunner.query(`DROP TABLE "items"`);
    await queryRunner.query(`DROP TABLE "variant_values"`);
    await queryRunner.query(`DROP TABLE "variants"`);
    await queryRunner.query(`DROP TABLE "ingredients"`);
    await queryRunner.query(`DROP TABLE "ingredient_categories"`);
    await queryRunner.query(`DROP TABLE "categories"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "variant_type_enum"`);
    await queryRunner.query(`DROP TYPE "item_status_enum"`);
  }
}
