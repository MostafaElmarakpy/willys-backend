import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersCartAddresses20260111121600 implements MigrationInterface {
  name = 'CreateOrdersCartAddresses20260111121600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(
      `CREATE TYPE "public"."order_type_enum" AS ENUM('PICKUP', 'DELIVERY')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum" AS ENUM('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REFUNDED')`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."address_type_enum" AS ENUM('HOME', 'WORK', 'OTHER')`,
    );

    // Create user_addresses table
    await queryRunner.query(`
      CREATE TABLE "user_addresses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "label" jsonb NOT NULL,
        "type" "public"."address_type_enum" NOT NULL DEFAULT 'HOME',
        "addressLine1" text NOT NULL,
        "addressLine2" text,
        "city" character varying(100),
        "area" character varying(100),
        "postalCode" character varying(20),
        "latitude" numeric(10,8) NOT NULL,
        "longitude" numeric(11,8) NOT NULL,
        "deliveryInstructions" text,
        "contactPhone" character varying(20),
        "isDefault" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "cachedBranchId" uuid,
        "cachedDeliveryFee" numeric(5,2),
        "lastValidatedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_user_addresses" PRIMARY KEY ("id")
      )
    `);

    // Create carts table
    await queryRunner.query(`
      CREATE TABLE "carts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "branchId" uuid,
        "orderType" "public"."order_type_enum",
        "deliveryAddressId" uuid,
        "scheduledPickupTime" TIMESTAMP,
        "specialInstructions" text,
        "subtotal" numeric(10,2) NOT NULL DEFAULT 0,
        "discountAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "deliveryFee" numeric(10,2) NOT NULL DEFAULT 0,
        "tax" numeric(10,2) NOT NULL DEFAULT 0,
        "total" numeric(10,2) NOT NULL DEFAULT 0,
        "appliedDiscounts" jsonb,
        "lastValidatedAt" TIMESTAMP,
        "validationErrors" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_carts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_carts_userId" UNIQUE ("userId")
      )
    `);

    // Create cart_items table
    await queryRunner.query(`
      CREATE TABLE "cart_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "cartId" uuid NOT NULL,
        "itemType" character varying(10) NOT NULL,
        "itemId" uuid,
        "bundleId" uuid,
        "quantity" integer NOT NULL DEFAULT 1,
        "unitPrice" numeric(10,2) NOT NULL,
        "totalPrice" numeric(10,2) NOT NULL,
        "selectedVariant" jsonb,
        "customizations" jsonb,
        "extras" jsonb,
        "specialInstructions" text,
        "discountAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "appliedDiscountId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_cart_items" PRIMARY KEY ("id")
      )
    `);

    // Create orders table
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderNumber" character varying(20) NOT NULL,
        "userId" uuid NOT NULL,
        "branchId" uuid NOT NULL,
        "orderType" "public"."order_type_enum" NOT NULL,
        "status" "public"."order_status_enum" NOT NULL DEFAULT 'PENDING',
        "deliveryAddressId" uuid,
        "deliveryAddressSnapshot" jsonb,
        "zoneId" uuid,
        "scheduledPickupTime" TIMESTAMP,
        "actualPickupTime" TIMESTAMP,
        "subtotal" numeric(10,2) NOT NULL,
        "discountAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "deliveryFee" numeric(10,2) NOT NULL DEFAULT 0,
        "tax" numeric(10,2) NOT NULL DEFAULT 0,
        "total" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'EGP',
        "appliedDiscounts" jsonb,
        "paymentId" uuid,
        "specialInstructions" text,
        "estimatedPrepTime" integer,
        "estimatedDeliveryTime" integer,
        "confirmedAt" TIMESTAMP,
        "preparingAt" TIMESTAMP,
        "readyAt" TIMESTAMP,
        "outForDeliveryAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "cancelledAt" TIMESTAMP,
        "cancellationReason" text,
        "cancelledById" uuid,
        "metadata" jsonb,
        "ipAddress" character varying(45),
        "userAgent" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_orders_orderNumber" UNIQUE ("orderNumber")
      )
    `);

    // Create order_items table
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "itemType" character varying(10) NOT NULL,
        "originalItemId" uuid NOT NULL,
        "name" jsonb NOT NULL,
        "description" jsonb,
        "image" character varying(500),
        "quantity" integer NOT NULL,
        "unitPrice" numeric(10,2) NOT NULL,
        "totalPrice" numeric(10,2) NOT NULL,
        "selectedVariant" jsonb,
        "customizations" jsonb,
        "extras" jsonb,
        "specialInstructions" text,
        "discountAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "appliedDiscount" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
      )
    `);

    // Create order_status_logs table
    await queryRunner.query(`
      CREATE TABLE "order_status_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "previousStatus" "public"."order_status_enum" NOT NULL,
        "newStatus" "public"."order_status_enum" NOT NULL,
        "notes" text,
        "changedById" uuid,
        "ipAddress" character varying(45),
        "metadata" jsonb,
        "occurredAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_order_status_logs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    // user_addresses indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_user_addresses_userId" ON "user_addresses" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_addresses_isDefault" ON "user_addresses" ("isDefault")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_addresses_latitude" ON "user_addresses" ("latitude")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_addresses_longitude" ON "user_addresses" ("longitude")`,
    );

    // carts indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_carts_userId" ON "carts" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_carts_branchId" ON "carts" ("branchId")`,
    );

    // cart_items indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_cart_items_cartId" ON "cart_items" ("cartId")`,
    );

    // orders indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_orderNumber" ON "orders" ("orderNumber")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_userId" ON "orders" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_branchId" ON "orders" ("branchId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_status" ON "orders" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_orderType" ON "orders" ("orderType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_paymentId" ON "orders" ("paymentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_createdAt" ON "orders" ("createdAt")`,
    );

    // order_items indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_orderId" ON "order_items" ("orderId")`,
    );

    // order_status_logs indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_order_status_logs_orderId" ON "order_status_logs" ("orderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_status_logs_occurredAt" ON "order_status_logs" ("occurredAt")`,
    );

    // Add foreign keys
    // user_addresses FK
    await queryRunner.query(`
      ALTER TABLE "user_addresses"
      ADD CONSTRAINT "FK_user_addresses_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // carts FKs
    await queryRunner.query(`
      ALTER TABLE "carts"
      ADD CONSTRAINT "FK_carts_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "carts"
      ADD CONSTRAINT "FK_carts_branchId"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "carts"
      ADD CONSTRAINT "FK_carts_deliveryAddressId"
      FOREIGN KEY ("deliveryAddressId") REFERENCES "user_addresses"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // cart_items FKs
    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_cartId"
      FOREIGN KEY ("cartId") REFERENCES "carts"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_itemId"
      FOREIGN KEY ("itemId") REFERENCES "items"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "cart_items"
      ADD CONSTRAINT "FK_cart_items_bundleId"
      FOREIGN KEY ("bundleId") REFERENCES "bundles"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // orders FKs
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_branchId"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_deliveryAddressId"
      FOREIGN KEY ("deliveryAddressId") REFERENCES "user_addresses"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_zoneId"
      FOREIGN KEY ("zoneId") REFERENCES "zones"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_paymentId"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_cancelledById"
      FOREIGN KEY ("cancelledById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // order_items FKs
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "FK_order_items_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // order_status_logs FKs
    await queryRunner.query(`
      ALTER TABLE "order_status_logs"
      ADD CONSTRAINT "FK_order_status_logs_orderId"
      FOREIGN KEY ("orderId") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "order_status_logs"
      ADD CONSTRAINT "FK_order_status_logs_changedById"
      FOREIGN KEY ("changedById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(
      `ALTER TABLE "order_status_logs" DROP CONSTRAINT "FK_order_status_logs_changedById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_logs" DROP CONSTRAINT "FK_order_status_logs_orderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_orderId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_cancelledById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_paymentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_zoneId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_deliveryAddressId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_branchId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_bundleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_itemId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_cart_items_cartId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" DROP CONSTRAINT "FK_carts_deliveryAddressId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" DROP CONSTRAINT "FK_carts_branchId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "carts" DROP CONSTRAINT "FK_carts_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_addresses" DROP CONSTRAINT "FK_user_addresses_userId"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_order_status_logs_occurredAt"`);
    await queryRunner.query(`DROP INDEX "IDX_order_status_logs_orderId"`);
    await queryRunner.query(`DROP INDEX "IDX_order_items_orderId"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_paymentId"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_orderType"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_status"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_branchId"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_orderNumber"`);
    await queryRunner.query(`DROP INDEX "IDX_cart_items_cartId"`);
    await queryRunner.query(`DROP INDEX "IDX_carts_branchId"`);
    await queryRunner.query(`DROP INDEX "IDX_carts_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_user_addresses_longitude"`);
    await queryRunner.query(`DROP INDEX "IDX_user_addresses_latitude"`);
    await queryRunner.query(`DROP INDEX "IDX_user_addresses_isDefault"`);
    await queryRunner.query(`DROP INDEX "IDX_user_addresses_userId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "order_status_logs"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
    await queryRunner.query(`DROP TABLE "carts"`);
    await queryRunner.query(`DROP TABLE "user_addresses"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "public"."address_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."order_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."order_type_enum"`);
  }
}
