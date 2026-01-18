import { faker } from "@faker-js/faker";
import * as bcrypt from "bcrypt";
import { UserProvider } from "../../src/common/enums/UserProvider";
import { UserRole } from "../../src/common/enums/UserRole";
import { UserStatus } from "../../src/common/enums/UserStatus";
import { Role } from "../../src/database/entities/role.entity";
import { User } from "../../src/database/entities/user.entity";
import { getRepository } from "../setup/test-app";

export interface CreateUserOptions {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  phoneNumberCountryCode?: string;
  password?: string;
  role?: UserRole;
  confirmAccount?: boolean;
  status?: UserStatus;
  userLocale?: string;
  provider?: UserProvider;
  adminRole?: Role;
}

/**
 * Generate a user with faker data
 */
export function generateUserData(
  options: CreateUserOptions = {},
): Partial<User> {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  // Generate a valid Egyptian mobile number (starts with 10, 11, 12, or 15)
  const egyptPrefixes = ["10", "11", "12", "15"];
  const randomPrefix =
    egyptPrefixes[Math.floor(Math.random() * egyptPrefixes.length)];
  const validEgyptPhone = `${randomPrefix}${faker.string.numeric(8)}`;

  return {
    fullName: options.fullName || `${firstName} ${lastName}`,
    email:
      options.email ||
      faker.internet.email({ firstName, lastName }).toLowerCase(),
    phoneNumber: options.phoneNumber || validEgyptPhone,
    phoneNumberCountryCode: options.phoneNumberCountryCode || "EG",
    password: options.password || "Test@1234",
    role: options.role || UserRole.user,
    confirmAccount:
      options.confirmAccount !== undefined ? options.confirmAccount : true,
    status: options.status || UserStatus.Online,
    userLocale: options.userLocale || "en",
    provider: options.provider || UserProvider.System,
    joined: new Date(),
  };
}

/**
 * Create a user in the database
 */
export async function createUser(
  options: CreateUserOptions = {},
): Promise<User> {
  const userData = generateUserData(options);

  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password!, 10);

  const userRepo = getRepository<User>(User);
  const user = userRepo.create({
    ...userData,
    password: hashedPassword,
  });

  // Assign admin role if provided
  if (options.adminRole) {
    user.adminRole = options.adminRole;
    user.adminRoleId = options.adminRole.id;
  }

  return userRepo.save(user);
}

/**
 * Create a customer user
 */
export async function createCustomer(
  options: CreateUserOptions = {},
): Promise<User> {
  return createUser({
    ...options,
    role: UserRole.user,
  });
}

/**
 * Create an admin user
 */
export async function createAdmin(
  options: CreateUserOptions = {},
): Promise<User> {
  return createUser({
    ...options,
    role: UserRole.admin,
  });
}

/**
 * Create multiple users
 */
export async function createUsers(
  count: number,
  options: CreateUserOptions = {},
): Promise<User[]> {
  const users: User[] = [];

  for (let i = 0; i < count; i++) {
    const user = await createUser({
      ...options,
      email: options.email ? `${i}-${options.email}` : undefined,
      phoneNumber: options.phoneNumber
        ? `${options.phoneNumber}${i}`
        : undefined,
    });
    users.push(user);
  }

  return users;
}

/**
 * Create a user with unverified email
 */
export async function createUnverifiedUser(
  options: CreateUserOptions = {},
): Promise<User> {
  return createUser({
    ...options,
    confirmAccount: false,
  });
}

/**
 * Create a blocked user
 */
export async function createBlockedUser(
  options: CreateUserOptions = {},
): Promise<User> {
  return createUser({
    ...options,
    status: UserStatus.Blocked,
  });
}
