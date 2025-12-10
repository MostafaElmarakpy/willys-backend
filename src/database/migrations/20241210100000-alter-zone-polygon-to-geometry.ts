import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterZonePolygonToGeometry20241210100000 implements MigrationInterface {
  name = 'AlterZonePolygonToGeometry20241210100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension if not already enabled
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    // Drop the existing GIN index on polygon JSONB field
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_zones_polygon_gin"`);

    // Add a temporary column for geometry
    await queryRunner.query(`
      ALTER TABLE "zones" ADD COLUMN "polygon_temp" geometry(Polygon, 4326)
    `);

    // Migrate existing JSONB polygon data to PostGIS geometry
    // This assumes the JSONB contains GeoJSON polygon structure
    await queryRunner.query(`
      UPDATE "zones" 
      SET "polygon_temp" = ST_GeomFromGeoJSON("polygon"::text)
      WHERE "polygon" IS NOT NULL
    `);

    // Drop the old JSONB polygon column
    await queryRunner.query(`ALTER TABLE "zones" DROP COLUMN "polygon"`);

    // Rename the temporary column to polygon
    await queryRunner.query(`
      ALTER TABLE "zones" RENAME COLUMN "polygon_temp" TO "polygon"
    `);

    // Make the polygon column NOT NULL
    await queryRunner.query(`ALTER TABLE "zones" ALTER COLUMN "polygon" SET NOT NULL`);

    // Create spatial index using GiST for geometry queries
    await queryRunner.query(`
      CREATE INDEX "IDX_zones_polygon_gist" ON "zones" USING gist ("polygon")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the spatial index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_zones_polygon_gist"`);

    // Add temporary JSONB column
    await queryRunner.query(`ALTER TABLE "zones" ADD COLUMN "polygon_temp" jsonb`);

    // Convert geometry back to GeoJSON JSONB
    await queryRunner.query(`
      UPDATE "zones" 
      SET "polygon_temp" = ST_AsGeoJSON("polygon")::jsonb
      WHERE "polygon" IS NOT NULL
    `);

    // Drop the geometry column
    await queryRunner.query(`ALTER TABLE "zones" DROP COLUMN "polygon"`);

    // Rename temporary column back to polygon
    await queryRunner.query(`
      ALTER TABLE "zones" RENAME COLUMN "polygon_temp" TO "polygon"
    `);

    // Make the polygon column NOT NULL
    await queryRunner.query(`ALTER TABLE "zones" ALTER COLUMN "polygon" SET NOT NULL`);

    // Recreate the original GIN index for JSONB
    await queryRunner.query(`
      CREATE INDEX "IDX_zones_polygon_gin" ON "zones" USING gin ("polygon")
    `);
  }
}