import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTagsToBundles20260111171500 implements MigrationInterface {
  name = 'AddTagsToBundles20260111171500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tags column to bundles table
    await queryRunner.query(`
      ALTER TABLE "bundles"
      ADD COLUMN "tags" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove tags column from bundles table
    await queryRunner.query(`
      ALTER TABLE "bundles"
      DROP COLUMN "tags"
    `);
  }
}
