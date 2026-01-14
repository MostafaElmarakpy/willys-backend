import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDiscountsModule20260111120800 implements MigrationInterface {
  name = "CreateDiscountsModule20260111120800";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "discount_type_enum" AS ENUM('percentage', 'fixed_amount', 'buy_x_get_y', 'free_item')
    `);

    await queryRunner.query(`
      CREATE TYPE "discount_status_enum" AS ENUM('active', 'inactive', 'scheduled', 'expired')
    `);

    await queryRunner.query(`
      CREATE TYPE "discount_target_type_enum" AS ENUM('user', 'item')
    `);

    // Create discounts table
    await queryRunner.query(`
      CREATE TABLE "discounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying,
        "name" jsonb NOT NULL,
        "description" jsonb,
        "type" "discount_type_enum" NOT NULL,
        "targetType" "discount_target_type_enum" NOT NULL,
        "value" numeric(10,2) NOT NULL,
        "buyQuantity" integer,
        "getQuantity" integer,
        "freeItemId" uuid,
        "minimumPurchase" numeric(10,2),
        "maxUsageTotal" integer,
        "maxUsagePerUser" integer,
        "currentUsageCount" integer NOT NULL DEFAULT 0,
        "startDate" TIMESTAMP NOT NULL,
        "endDate" TIMESTAMP,
        "status" "discount_status_enum" NOT NULL DEFAULT 'scheduled',
        "isActive" boolean NOT NULL DEFAULT false,
        "createdBy" uuid NOT NULL,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_discounts" PRIMARY KEY ("id")
      )
    `);

    // Create user_discounts junction table
    await queryRunner.query(`
      CREATE TABLE "user_discounts" (
        "userId" uuid NOT NULL,
        "discountId" uuid NOT NULL,
        "usageCount" integer NOT NULL DEFAULT 0,
        "lastUsedAt" TIMESTAMP,
        "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "assignedBy" uuid NOT NULL,
        CONSTRAINT "PK_user_discounts" PRIMARY KEY ("userId", "discountId")
      )
    `);

    // Create item_discounts junction table
    await queryRunner.query(`
      CREATE TABLE "item_discounts" (
        "itemId" uuid NOT NULL,
        "discountId" uuid NOT NULL,
        "assignedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "assignedBy" uuid NOT NULL,
        CONSTRAINT "PK_item_discounts" PRIMARY KEY ("itemId", "discountId")
      )
    `);

    // Create discount_usage_logs table
    await queryRunner.query(`
      CREATE TABLE "discount_usage_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "discountId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "orderId" uuid,
        "itemId" uuid,
        "discountAmount" numeric(10,2) NOT NULL,
        "usedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_discount_usage_logs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for discounts table
    await queryRunner.query(`
      CREATE INDEX "IDX_discounts_type" ON "discounts" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discounts_targetType" ON "discounts" ("targetType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discounts_status" ON "discounts" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discounts_isActive" ON "discounts" ("isActive")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_discounts_code" ON "discounts" ("code") WHERE "code" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discounts_dates" ON "discounts" ("startDate", "endDate")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discounts_name_gin" ON "discounts" USING GIN ("name")
    `);

    // Create indexes for user_discounts table
    await queryRunner.query(`
      CREATE INDEX "IDX_user_discounts_userId" ON "user_discounts" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_discounts_discountId" ON "user_discounts" ("discountId")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_discounts_userId_discountId" ON "user_discounts" ("userId", "discountId")
    `);

    // Create indexes for item_discounts table
    await queryRunner.query(`
      CREATE INDEX "IDX_item_discounts_itemId" ON "item_discounts" ("itemId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_item_discounts_discountId" ON "item_discounts" ("discountId")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_item_discounts_itemId_discountId" ON "item_discounts" ("itemId", "discountId")
    `);

    // Create indexes for discount_usage_logs table
    await queryRunner.query(`
      CREATE INDEX "IDX_discount_usage_logs_discountId" ON "discount_usage_logs" ("discountId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discount_usage_logs_userId" ON "discount_usage_logs" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_discount_usage_logs_usedAt" ON "discount_usage_logs" ("usedAt")
    `);

    // Add foreign key constraints for discounts table
    await queryRunner.query(`
      ALTER TABLE "discounts"
      ADD CONSTRAINT "FK_discounts_freeItemId"
      FOREIGN KEY ("freeItemId") REFERENCES "items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "discounts"
      ADD CONSTRAINT "FK_discounts_createdBy"
      FOREIGN KEY ("createdBy") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "discounts"
      ADD CONSTRAINT "FK_discounts_updatedBy"
      FOREIGN KEY ("updatedBy") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // Add foreign key constraints for user_discounts table
    await queryRunner.query(`
      ALTER TABLE "user_discounts"
      ADD CONSTRAINT "FK_user_discounts_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_discounts"
      ADD CONSTRAINT "FK_user_discounts_discountId"
      FOREIGN KEY ("discountId") REFERENCES "discounts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_discounts"
      ADD CONSTRAINT "FK_user_discounts_assignedBy"
      FOREIGN KEY ("assignedBy") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // Add foreign key constraints for item_discounts table
    await queryRunner.query(`
      ALTER TABLE "item_discounts"
      ADD CONSTRAINT "FK_item_discounts_itemId"
      FOREIGN KEY ("itemId") REFERENCES "items"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "item_discounts"
      ADD CONSTRAINT "FK_item_discounts_discountId"
      FOREIGN KEY ("discountId") REFERENCES "discounts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "item_discounts"
      ADD CONSTRAINT "FK_item_discounts_assignedBy"
      FOREIGN KEY ("assignedBy") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
    `);

    // Add foreign key constraints for discount_usage_logs table
    await queryRunner.query(`
      ALTER TABLE "discount_usage_logs"
      ADD CONSTRAINT "FK_discount_usage_logs_discountId"
      FOREIGN KEY ("discountId") REFERENCES "discounts"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "discount_usage_logs"
      ADD CONSTRAINT "FK_discount_usage_logs_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "discount_usage_logs"
      ADD CONSTRAINT "FK_discount_usage_logs_itemId"
      FOREIGN KEY ("itemId") REFERENCES "items"("id")
      ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints - discount_usage_logs
    await queryRunner.query(
      `ALTER TABLE "discount_usage_logs" DROP CONSTRAINT "FK_discount_usage_logs_itemId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discount_usage_logs" DROP CONSTRAINT "FK_discount_usage_logs_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discount_usage_logs" DROP CONSTRAINT "FK_discount_usage_logs_discountId"`,
    );

    // Drop foreign key constraints - item_discounts
    await queryRunner.query(
      `ALTER TABLE "item_discounts" DROP CONSTRAINT "FK_item_discounts_assignedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_discounts" DROP CONSTRAINT "FK_item_discounts_discountId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "item_discounts" DROP CONSTRAINT "FK_item_discounts_itemId"`,
    );

    // Drop foreign key constraints - user_discounts
    await queryRunner.query(
      `ALTER TABLE "user_discounts" DROP CONSTRAINT "FK_user_discounts_assignedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_discounts" DROP CONSTRAINT "FK_user_discounts_discountId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_discounts" DROP CONSTRAINT "FK_user_discounts_userId"`,
    );

    // Drop foreign key constraints - discounts
    await queryRunner.query(
      `ALTER TABLE "discounts" DROP CONSTRAINT "FK_discounts_updatedBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discounts" DROP CONSTRAINT "FK_discounts_createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "discounts" DROP CONSTRAINT "FK_discounts_freeItemId"`,
    );

    // Drop indexes - discount_usage_logs
    await queryRunner.query(`DROP INDEX "IDX_discount_usage_logs_usedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_discount_usage_logs_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_discount_usage_logs_discountId"`);

    // Drop indexes - item_discounts
    await queryRunner.query(
      `DROP INDEX "IDX_item_discounts_itemId_discountId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_item_discounts_discountId"`);
    await queryRunner.query(`DROP INDEX "IDX_item_discounts_itemId"`);

    // Drop indexes - user_discounts
    await queryRunner.query(
      `DROP INDEX "IDX_user_discounts_userId_discountId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_user_discounts_discountId"`);
    await queryRunner.query(`DROP INDEX "IDX_user_discounts_userId"`);

    // Drop indexes - discounts
    await queryRunner.query(`DROP INDEX "IDX_discounts_name_gin"`);
    await queryRunner.query(`DROP INDEX "IDX_discounts_dates"`);
    await queryRunner.query(`DROP INDEX "IDX_discounts_code"`);
    await queryRunner.query(`DROP INDEX "IDX_discounts_isActive"`);
    await queryRunner.query(`DROP INDEX "IDX_discounts_status"`);
    await queryRunner.query(`DROP INDEX "IDX_discounts_targetType"`);
    await queryRunner.query(`DROP INDEX "IDX_discounts_type"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "discount_usage_logs"`);
    await queryRunner.query(`DROP TABLE "item_discounts"`);
    await queryRunner.query(`DROP TABLE "user_discounts"`);
    await queryRunner.query(`DROP TABLE "discounts"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "discount_target_type_enum"`);
    await queryRunner.query(`DROP TYPE "discount_status_enum"`);
    await queryRunner.query(`DROP TYPE "discount_type_enum"`);
  }
}
