import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranchesAndZones20260111120100 implements MigrationInterface {
  name = 'CreateBranchesAndZones20260111120100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create branches table
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb NOT NULL,
        "address" text NOT NULL,
        "latitude" numeric(10,8) NOT NULL,
        "longitude" numeric(11,8) NOT NULL,
        "phone" character varying(20),
        "email" character varying(255),
        "isActive" boolean NOT NULL DEFAULT true,
        "isOpen" boolean NOT NULL DEFAULT true,
        "openingHours" character varying(100),
        "closingHours" character varying(100),
        "deliveryFee" numeric(5,2),
        "estimatedDeliveryTime" integer,
        "createdById" uuid,
        "updatedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_e2d8cf5dd1f243f17e8df5b7c0e" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on branches table
    await queryRunner.query(`
      CREATE INDEX "IDX_branches_latitude" ON "branches" ("latitude")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_branches_longitude" ON "branches" ("longitude")
    `);

    // Create GIN indexes for JSONB name fields for full-text search
    await queryRunner.query(`
      CREATE INDEX "IDX_branches_name_gin" ON "branches" USING gin ("name")
    `);

    // Create zones table
    await queryRunner.query(`
      CREATE TABLE "zones" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" jsonb,
        "branchId" uuid NOT NULL,
        "polygon" jsonb NOT NULL,
        "centerLatitude" numeric(10,8),
        "centerLongitude" numeric(11,8),
        "radiusKm" numeric(10,3),
        "isActive" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 0,
        "createdById" uuid,
        "updatedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_6a9fead4a490b19ebc4e1ca6de4" PRIMARY KEY ("id")
      )
    `);

    // Create spatial index on polygon field (GiST index for JSONB spatial queries)
    await queryRunner.query(`
      CREATE INDEX "IDX_zones_polygon_gin" ON "zones" USING gin ("polygon")
    `);

    // Create GIN index for zone names
    await queryRunner.query(`
      CREATE INDEX "IDX_zones_name_gin" ON "zones" USING gin ("name")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "zones" ADD CONSTRAINT "FK_zones_branch" 
      FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE
    `);

    // Add foreign key constraints for user relationships
    await queryRunner.query(`
      ALTER TABLE "branches" ADD CONSTRAINT "FK_branches_created_by" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "branches" ADD CONSTRAINT "FK_branches_updated_by" 
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "zones" ADD CONSTRAINT "FK_zones_created_by" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "zones" ADD CONSTRAINT "FK_zones_updated_by" 
      FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "zones" DROP CONSTRAINT "FK_zones_updated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "zones" DROP CONSTRAINT "FK_zones_created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "branches" DROP CONSTRAINT "FK_branches_updated_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "branches" DROP CONSTRAINT "FK_branches_created_by"
    `);

    await queryRunner.query(`
      ALTER TABLE "zones" DROP CONSTRAINT "FK_zones_branch"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_zones_name_gin"`);
    await queryRunner.query(`DROP INDEX "IDX_zones_polygon_gin"`);
    await queryRunner.query(`DROP INDEX "IDX_branches_name_gin"`);
    await queryRunner.query(`DROP INDEX "IDX_branches_longitude"`);
    await queryRunner.query(`DROP INDEX "IDX_branches_latitude"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "zones"`);
    await queryRunner.query(`DROP TABLE "branches"`);
  }
}
