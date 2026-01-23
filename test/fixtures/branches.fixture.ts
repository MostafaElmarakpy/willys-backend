import { Branch } from "../../src/database/entities/branch.entity";
import { User } from "../../src/database/entities/user.entity";
import { Zone } from "../../src/database/entities/zone.entity";
import {
  createBranch,
  createBranchWithZones,
  createZone,
} from "../factories/branch.factory";

export interface TestBranchStructure {
  mainBranch: Branch;
  mainZones: Zone[];
  secondBranch: Branch;
  secondZones: Zone[];
}

/**
 * Create predefined test branches with delivery zones
 */
export async function createTestBranches(
  createdBy: User,
): Promise<TestBranchStructure> {
  // Create main branch in Nasr City, Cairo
  const { branch: mainBranch, zones: mainZones } = await createBranchWithZones(
    createdBy,
    2,
    {
      name: {
        en: "Nasr City Branch",
        ar: "فرع مدينة نصر",
      },
      address: "123 Main Street, Nasr City, Cairo",
      latitude: 30.0444,
      longitude: 31.2357,
      phone: "+201234567890",
      isActive: true,
    },
    {
      deliveryFee: 25,
      minimumOrder: 100,
    },
  );

  // Create second branch in Maadi, Cairo
  const { branch: secondBranch, zones: secondZones } =
    await createBranchWithZones(
      createdBy,
      2,
      {
        name: {
          en: "Maadi Branch",
          ar: "فرع المعادي",
        },
        address: "456 Corniche Street, Maadi, Cairo",
        latitude: 29.9602,
        longitude: 31.2569,
        phone: "+201234567891",
        isActive: true,
      },
      {
        deliveryFee: 30,
        minimumOrder: 120,
      },
    );

  return {
    mainBranch,
    mainZones,
    secondBranch,
    secondZones,
  };
}

/**
 * Create a single test branch with a zone
 */
export async function createDefaultBranch(
  createdBy: User,
): Promise<{ branch: Branch; zone: Zone }> {
  const branch = await createBranch(createdBy, {
    name: {
      en: "Test Branch",
      ar: "فرع اختبار",
    },
    address: "Test Address, Cairo",
    latitude: 30.0444,
    longitude: 31.2357,
    phone: "+201234567890",
    isActive: true,
  });

  const zone = await createZone(branch, createdBy, {
    name: {
      en: "Test Zone",
      ar: "منطقة اختبار",
    },
    deliveryFee: 20,
    minimumOrder: 100,
  });

  return { branch, zone };
}

/**
 * Get test coordinates within the main zone (for address testing)
 */
export function getTestCoordinatesInMainZone() {
  return {
    // These coordinates should fall within the main branch zone
    withinZone: {
      latitude: 30.0444,
      longitude: 31.2357,
    },
    // These coordinates are outside all zones
    outsideZone: {
      latitude: 31.0,
      longitude: 30.0,
    },
  };
}
