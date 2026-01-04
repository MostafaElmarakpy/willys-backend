import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveDeliveryFeeToZone20260104145400
  implements MigrationInterface
{
  name = 'MoveDeliveryFeeToZone20260104145400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add deliveryFee column to zones table
    await queryRunner.query(`
      ALTER TABLE "zones"
      ADD COLUMN "deliveryFee" numeric(5,2) DEFAULT 0
    `);

    // Copy deliveryFee data from branches to their respective zones
    // For each branch, update all its zones with the branch's deliveryFee
    await queryRunner.query(`
      UPDATE "zones" z
      SET "deliveryFee" = b."deliveryFee"
      FROM "branches" b
      WHERE z."branchId" = b.id
      AND b."deliveryFee" IS NOT NULL
    `);

    // Set default value for zones where branch deliveryFee was null
    await queryRunner.query(`
      UPDATE "zones"
      SET "deliveryFee" = 0
      WHERE "deliveryFee" IS NULL
    `);

    // Make deliveryFee NOT NULL after setting defaults
    await queryRunner.query(`
      ALTER TABLE "zones"
      ALTER COLUMN "deliveryFee" SET NOT NULL
    `);

    // Remove deliveryFee column from branches table
    await queryRunner.query(`
      ALTER TABLE "branches"
      DROP COLUMN "deliveryFee"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add deliveryFee column back to branches table
    await queryRunner.query(`
      ALTER TABLE "branches"
      ADD COLUMN "deliveryFee" numeric(5,2)
    `);

    // Copy deliveryFee data from zones back to branches
    // For each branch, use the deliveryFee from its first zone (or average if multiple)
    await queryRunner.query(`
      UPDATE "branches" b
      SET "deliveryFee" = (
        SELECT AVG(z."deliveryFee")
        FROM "zones" z
        WHERE z."branchId" = b.id
        GROUP BY z."branchId"
      )
    `);

    // Remove deliveryFee column from zones table
    await queryRunner.query(`
      ALTER TABLE "zones"
      DROP COLUMN "deliveryFee"
    `);
  }
}
