import { faker } from "@faker-js/faker";
import { User } from "../../src/database/entities/user.entity";
import { UserAddress } from "../../src/database/entities/user-address.entity";
import { getRepository } from "../setup/test-app";

export enum AddressType {
  HOME = "home",
  WORK = "work",
  OTHER = "other",
}

export interface CreateAddressOptions {
  userId?: string;
  user?: User;
  type?: AddressType;
  label?: string;
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
 */
export function generateAddressData(
  options: CreateAddressOptions = {},
): Partial<UserAddress> {
  // Cairo coordinates range
  const latitude =
    options.latitude || faker.location.latitude({ min: 29.9, max: 30.2 });
  const longitude =
    options.longitude || faker.location.longitude({ min: 31.1, max: 31.5 });

  return {
    type: options.type || AddressType.HOME,
    label: options.label || `${options.type || AddressType.HOME} Address`,
    streetAddress: options.streetAddress || faker.location.streetAddress(),
    building:
      options.building || faker.number.int({ min: 1, max: 200 }).toString(),
    floor: options.floor || faker.number.int({ min: 1, max: 20 }).toString(),
    apartment:
      options.apartment || faker.number.int({ min: 1, max: 50 }).toString(),
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
    label: "Home",
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
    label: "Work",
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
