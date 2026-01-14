import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaymentsModule20260111121300 implements MigrationInterface {
  name = "CreatePaymentsModule20260111121300";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "payment_type_enum" AS ENUM('CASH', 'CARD')
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_status_enum" AS ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED')
    `);

    await queryRunner.query(`
      CREATE TYPE "payment_event_type_enum" AS ENUM('CREATED', 'PROCESSING', 'SUCCESS', 'FAILED', 'WEBHOOK_RECEIVED', 'STATUS_CHANGED', 'REFUND_REQUESTED', 'REFUNDED')
    `);

    await queryRunner.query(`
      CREATE TYPE "refund_type_enum" AS ENUM('FULL', 'PARTIAL')
    `);

    await queryRunner.query(`
      CREATE TYPE "refund_status_enum" AS ENUM('PENDING', 'APPROVED', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED')
    `);

    // Create payments table
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transactionId" character varying(100) NOT NULL,
        "paymobOrderId" character varying(50),
        "merchantOrderId" character varying(100),
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'EGP',
        "paymentType" "payment_type_enum" NOT NULL,
        "status" "payment_status_enum" NOT NULL DEFAULT 'PENDING',
        "userId" uuid NOT NULL,
        "paymentMethodId" uuid,
        "paymobTransactionId" character varying(255),
        "paymobIframeUrl" text,
        "paymobPaymentKey" character varying(500),
        "paymobResponse" jsonb,
        "cashReferenceNumber" character varying(100),
        "cardLastFourDigits" character varying(4),
        "cardBrand" character varying(50),
        "description" text,
        "metadata" jsonb,
        "errorMessage" text,
        "errorCode" character varying(50),
        "refundedAmount" numeric(10,2) NOT NULL DEFAULT 0,
        "isRefundable" boolean NOT NULL DEFAULT false,
        "paidAt" TIMESTAMP,
        "failedAt" TIMESTAMP,
        "refundedAt" TIMESTAMP,
        "ipAddress" character varying(45),
        "userAgent" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_transactionId" UNIQUE ("transactionId"),
        CONSTRAINT "UQ_payments_paymobOrderId" UNIQUE ("paymobOrderId")
      )
    `);

    // Create payment_methods table
    await queryRunner.query(`
      CREATE TABLE "payment_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "paymobToken" character varying(500) NOT NULL,
        "cardLastFourDigits" character varying(4) NOT NULL,
        "cardBrand" character varying(50) NOT NULL,
        "expiryMonth" character varying(7),
        "expiryYear" character varying(4),
        "cardHolderName" character varying(100),
        "isDefault" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "nickname" character varying(255),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_payment_methods" PRIMARY KEY ("id")
      )
    `);

    // Create payment_transaction_logs table
    await queryRunner.query(`
      CREATE TABLE "payment_transaction_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "paymentId" uuid NOT NULL,
        "eventType" "payment_event_type_enum" NOT NULL,
        "previousStatus" "payment_status_enum" NOT NULL,
        "newStatus" "payment_status_enum" NOT NULL,
        "eventData" jsonb,
        "notes" text,
        "ipAddress" character varying(45),
        "occurredAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_payment_transaction_logs" PRIMARY KEY ("id")
      )
    `);

    // Create refunds table
    await queryRunner.query(`
      CREATE TABLE "refunds" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "paymentId" uuid NOT NULL,
        "refundId" character varying(100) NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "refundType" "refund_type_enum" NOT NULL,
        "status" "refund_status_enum" NOT NULL DEFAULT 'PENDING',
        "reason" text NOT NULL,
        "adminNotes" text,
        "requestedById" uuid NOT NULL,
        "requestedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "approvedById" uuid,
        "approvedAt" TIMESTAMP,
        "paymobRefundId" character varying(255),
        "paymobResponse" jsonb,
        "errorMessage" text,
        "processedAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "isAutomatic" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        CONSTRAINT "PK_refunds" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refunds_refundId" UNIQUE ("refundId")
      )
    `);

    // Create indexes for payments table
    await queryRunner.query(`
      CREATE INDEX "IDX_payments_transactionId" ON "payments" ("transactionId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payments_paymobOrderId" ON "payments" ("paymobOrderId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payments_userId" ON "payments" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payments_status" ON "payments" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payments_paymentType" ON "payments" ("paymentType")
    `);

    // Create indexes for payment_methods table
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_methods_userId" ON "payment_methods" ("userId")
    `);

    // Create indexes for payment_transaction_logs table
    await queryRunner.query(`
      CREATE INDEX "IDX_payment_transaction_logs_paymentId" ON "payment_transaction_logs" ("paymentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_transaction_logs_eventType" ON "payment_transaction_logs" ("eventType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_payment_transaction_logs_occurredAt" ON "payment_transaction_logs" ("occurredAt")
    `);

    // Create indexes for refunds table
    await queryRunner.query(`
      CREATE INDEX "IDX_refunds_paymentId" ON "refunds" ("paymentId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refunds_refundId" ON "refunds" ("refundId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refunds_status" ON "refunds" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_refunds_refundType" ON "refunds" ("refundType")
    `);

    // Add foreign keys for payments table
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_paymentMethodId"
      FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Add foreign keys for payment_methods table
    await queryRunner.query(`
      ALTER TABLE "payment_methods"
      ADD CONSTRAINT "FK_payment_methods_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Add foreign keys for payment_transaction_logs table
    await queryRunner.query(`
      ALTER TABLE "payment_transaction_logs"
      ADD CONSTRAINT "FK_payment_transaction_logs_paymentId"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Add foreign keys for refunds table
    await queryRunner.query(`
      ALTER TABLE "refunds"
      ADD CONSTRAINT "FK_refunds_paymentId"
      FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "refunds"
      ADD CONSTRAINT "FK_refunds_requestedById"
      FOREIGN KEY ("requestedById") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "refunds"
      ADD CONSTRAINT "FK_refunds_approvedById"
      FOREIGN KEY ("approvedById") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "refunds" DROP CONSTRAINT "FK_refunds_approvedById"
    `);

    await queryRunner.query(`
      ALTER TABLE "refunds" DROP CONSTRAINT "FK_refunds_requestedById"
    `);

    await queryRunner.query(`
      ALTER TABLE "refunds" DROP CONSTRAINT "FK_refunds_paymentId"
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_transaction_logs" DROP CONSTRAINT "FK_payment_transaction_logs_paymentId"
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_methods" DROP CONSTRAINT "FK_payment_methods_userId"
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_paymentMethodId"
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_userId"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_refunds_refundType"`);
    await queryRunner.query(`DROP INDEX "IDX_refunds_status"`);
    await queryRunner.query(`DROP INDEX "IDX_refunds_refundId"`);
    await queryRunner.query(`DROP INDEX "IDX_refunds_paymentId"`);
    await queryRunner.query(
      `DROP INDEX "IDX_payment_transaction_logs_occurredAt"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_payment_transaction_logs_eventType"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_payment_transaction_logs_paymentId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_payment_methods_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_paymentType"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_status"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_paymobOrderId"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_transactionId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "refunds"`);
    await queryRunner.query(`DROP TABLE "payment_transaction_logs"`);
    await queryRunner.query(`DROP TABLE "payment_methods"`);
    await queryRunner.query(`DROP TABLE "payments"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "refund_status_enum"`);
    await queryRunner.query(`DROP TYPE "refund_type_enum"`);
    await queryRunner.query(`DROP TYPE "payment_event_type_enum"`);
    await queryRunner.query(`DROP TYPE "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "payment_type_enum"`);
  }
}
