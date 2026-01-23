import { faker } from "@faker-js/faker";
import { BilingualStringObject } from "../../src/common/dto/bilingual-string.dto";
import { Branch } from "../../src/database/entities/branch.entity";
import { User } from "../../src/database/entities/user.entity";
import { Zone } from "../../src/database/entities/zone.entity";
import { getRepository } from "../setup/test-app";

export interface CreateBranchOptions {
  name?: BilingualStringObject;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  isActive?: boolean;
  openingHours?: any;
  createdBy?: User;
}

export interface CreateZoneOptions {
  name?: BilingualStringObject;
  branch?: Branch;
  branchId?: string;
  polygon?: any; // GeoJSON polygon
  deliveryFee?: number;
  minimumOrder?: number;
  isActive?: boolean;
  createdBy?: User;
}

/**
 * Generate a GeoJSON polygon for a delivery zone
 * Creates a rectangular zone around a center point
 */
export function generateZonePolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 5,
): any {
  // Simple rectangular polygon (in real app, would be more complex)
  const latOffset = radiusKm / 111; // Rough conversion: 1 degree lat ≈ 111 km
  const lngOffset = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));

  return {
    type: "Polygon",
    coordinates: [
      [
        [centerLng - lngOffset, centerLat - latOffset],
        [centerLng + lngOffset, centerLat - latOffset],
        [centerLng + lngOffset, centerLat + latOffset],
        [centerLng - lngOffset, centerLat + latOffset],
        [centerLng - lngOffset, centerLat - latOffset], // Close the polygon
      ],
    ],
  };
}

/**
 * Generate branch data
 */
export function generateBranchData(
  options: CreateBranchOptions = {},
): Partial<Branch> {
  const branchName = faker.company.name();
  const latitude =
    options.latitude || faker.location.latitude({ min: 29.9, max: 30.2 });
  const longitude =
    options.longitude || faker.location.longitude({ min: 31.1, max: 31.5 });

  return {
    name: options.name || {
      en: branchName,
      ar: branchName,
    },
    address: options.address || faker.location.streetAddress(),
    latitude,
    longitude,
    phone: options.phone || faker.phone.number({ style: "international" }),
    isActive: options.isActive !== undefined ? options.isActive : true,
    openingHours: options.openingHours?.monday?.open || "09:00",
    closingHours: options.openingHours?.monday?.close || "23:00",
  };
}

/**
 * Create a branch in the database
 */
export async function createBranch(
  createdBy: User,
  options: CreateBranchOptions = {},
): Promise<Branch> {
  const branchData = generateBranchData(options);

  const branchRepo = getRepository<Branch>(Branch);
  const branch = branchRepo.create({
    ...branchData,
    createdById: createdBy.id,
    createdBy: createdBy,
  });

  return branchRepo.save(branch);
}

/**
 * Generate zone data
 */
export function generateZoneData(
  branch: Branch,
  options: CreateZoneOptions = {},
): Partial<Zone> {
  const zoneName = faker.location.city();

  return {
    name: options.name || {
      en: `${zoneName} Zone`,
      ar: `منطقة ${zoneName}`,
    },
    polygon:
      options.polygon || generateZonePolygon(branch.latitude, branch.longitude),
    deliveryFee:
      options.deliveryFee ||
      faker.number.float({ min: 10, max: 50, fractionDigits: 2 }),
    isActive: options.isActive !== undefined ? options.isActive : true,
  };
}

/**
 * Create a zone in the database
 */
export async function createZone(
  branch: Branch,
  createdBy: User,
  options: CreateZoneOptions = {},
): Promise<Zone> {
  const zoneData = generateZoneData(branch, options);

  const zoneRepo = getRepository<Zone>(Zone);
  const zone = zoneRepo.create({
    ...zoneData,
    branch,
    branchId: branch.id,
    createdById: createdBy.id,
    createdBy: createdBy,
  });

  return zoneRepo.save(zone);
}

/**
 * Create a branch with zones
 */
export async function createBranchWithZones(
  createdBy: User,
  zoneCount: number = 2,
  branchOptions: CreateBranchOptions = {},
  zoneOptions: CreateZoneOptions = {},
): Promise<{ branch: Branch; zones: Zone[] }> {
  const branch = await createBranch(createdBy, branchOptions);
  const zones: Zone[] = [];

  for (let i = 0; i < zoneCount; i++) {
    const zone = await createZone(branch, createdBy, zoneOptions);
    zones.push(zone);
  }

  return { branch, zones };
}

/**
 * Create multiple branches
 */
export async function createBranches(
  createdBy: User,
  count: number,
  options: CreateBranchOptions = {},
): Promise<Branch[]> {
  const branches: Branch[] = [];

  for (let i = 0; i < count; i++) {
    const branch = await createBranch(createdBy, options);
    branches.push(branch);
  }

  return branches;
}
