import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimestampsToDiscountUsageLogs20260111121500 implements MigrationInterface {
  name = 'AddTimestampsToDiscountUsageLogs20260111121500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add createdAt column to discount_usage_logs
    await queryRunner.query(`
      ALTER TABLE "discount_usage_logs" 
      ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Add updatedAt column to discount_usage_logs
    await queryRunner.query(`
      ALTER TABLE "discount_usage_logs" 
      ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove updatedAt column from discount_usage_logs
    await queryRunner.query(`
      ALTER TABLE "discount_usage_logs" DROP COLUMN "updatedAt"
    `);

    // Remove createdAt column from discount_usage_logs
    await queryRunner.query(`
      ALTER TABLE "discount_usage_logs" DROP COLUMN "createdAt"
    `);
  }
}
