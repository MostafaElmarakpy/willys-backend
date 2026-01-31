import { faker } from "@faker-js/faker";
import { BilingualStringObject } from "../../src/common/dto/bilingual-string.dto";
import { AddressType } from "../../src/common/enums/AddressType";
import { User } from "../../src/database/entities/user.entity";
import { UserAddress } from "../../src/database/entities/user-address.entity";
import { getRepository } from "../setup/test-app";

export interface CreateAddressOptions {
  userId?: string;
  user?: User;
  type?: AddressType;
  label?: BilingualStringObject;
  streetAddress?: string;
  building?: string;
  floor?: string;
  apartment?: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  deliveryInstructions?: string;
}

/**
 * Generate address data
 * Default coordinates are in Cairo, Egypt area
 * Defaults to coordinates within the main test branch zone (Nasr City)
 */
export function generateAddressData(
  options: CreateAddressOptions = {},
): Partial<UserAddress> {
  // Default to coordinates within main test branch zone (30.0444, 31.2357) ± 2km
  // This ensures addresses work with test zones which have 5km radius
  const latitude =
    options.latitude || faker.location.latitude({ min: 30.025, max: 30.065 });
  const longitude =
    options.longitude || faker.location.longitude({ min: 31.215, max: 31.255 });

  const typeLabel = options.type || AddressType.HOME;
  const defaultLabel: BilingualStringObject = {
    en: `${typeLabel} Address`,
    ar: `عنوان ${typeLabel === AddressType.HOME ? "المنزل" : typeLabel === AddressType.WORK ? "العمل" : "آخر"}`,
  };

  return {
    type: typeLabel,
    label: options.label || defaultLabel,
    addressLine1: options.streetAddress || faker.location.streetAddress(),
    addressLine2:
      options.building || faker.number.int({ min: 1, max: 200 }).toString(),
    city: options.city || "Cairo",
    area: options.area || faker.location.city(),
    latitude,
    longitude,
    isDefault: options.isDefault || false,
    deliveryInstructions: options.deliveryInstructions || undefined,
  };
}

/**
 * Create an address in the database
 */
export async function createAddress(
  user: User,
  options: CreateAddressOptions = {},
): Promise<UserAddress> {
  const addressData = generateAddressData(options);

  const addressRepo = getRepository<UserAddress>(UserAddress);
  const address = addressRepo.create({
    ...addressData,
    user,
    userId: user.id,
  });

  return addressRepo.save(address);
}

/**
 * Create a home address
 */
export async function createHomeAddress(
  user: User,
  options: CreateAddressOptions = {},
): Promise<UserAddress> {
  return createAddress(user, {
    ...options,
    type: AddressType.HOME,
    label: { en: "Home", ar: "المنزل" },
  });
}

/**
 * Create a work address
 */
export async function createWorkAddress(
  user: User,
  options: CreateAddressOptions = {},
): Promise<UserAddress> {
  return createAddress(user, {
    ...options,
    type: AddressType.WORK,
    label: { en: "Work", ar: "العمل" },
  });
}

/**
 * Create multiple addresses for a user
 */
export async function createAddresses(
  user: User,
  count: number,
  options: CreateAddressOptions = {},
): Promise<UserAddress[]> {
  const addresses: UserAddress[] = [];

  for (let i = 0; i < count; i++) {
    const address = await createAddress(user, {
      ...options,
      isDefault: i === 0 && options.isDefault !== false,
    });
    addresses.push(address);
  }

  return addresses;
}

/**
 * Create address within a specific zone (coordinates)
 */
export async function createAddressInZone(
  user: User,
  minLat: number,
  maxLat: number,
  minLng: number,
  maxLng: number,
  options: CreateAddressOptions = {},
): Promise<UserAddress> {
  const latitude = faker.location.latitude({ min: minLat, max: maxLat });
  const longitude = faker.location.longitude({ min: minLng, max: maxLng });

  return createAddress(user, {
    ...options,
    latitude,
    longitude,
  });
}
