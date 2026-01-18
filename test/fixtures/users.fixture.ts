import { User } from "../../src/database/entities/user.entity";
import { createSuperAdminRole } from "../factories/role.factory";
import { createAdmin, createCustomer } from "../factories/user.factory";

export interface TestUsers {
  customer: User;
  admin: User;
  customer2: User;
  customer3: User;
}

/**
 * Generate a valid Egyptian phone number
 */
function generateEgyptPhone(): string {
  const prefixes = ["10", "11", "12", "15"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0");
  return `${prefix}${suffix}`;
}

/**
 * Create a set of predefined test users
 */
export async function createTestUsers(): Promise<TestUsers> {
  // Create SUPER_ADMIN role
  const superAdminRole = await createSuperAdminRole();

  // Create a default customer
  const customer = await createCustomer({
    fullName: "John Doe",
    email: "customer@test.com",
    phoneNumber: generateEgyptPhone(),
    phoneNumberCountryCode: "EG",
    password: "Test@1234",
    confirmAccount: true,
  });

  // Create an admin user with SUPER_ADMIN role
  const admin = await createAdmin({
    fullName: "Admin User",
    email: "admin@test.com",
    phoneNumber: generateEgyptPhone(),
    phoneNumberCountryCode: "EG",
    password: "Admin@1234",
    confirmAccount: true,
    adminRole: superAdminRole,
  });

  // Create additional customers for multi-user tests
  const customer2 = await createCustomer({
    fullName: "Jane Smith",
    email: "customer2@test.com",
    phoneNumber: generateEgyptPhone(),
    phoneNumberCountryCode: "EG",
    password: "Test@1234",
    confirmAccount: true,
  });

  const customer3 = await createCustomer({
    fullName: "Bob Wilson",
    email: "customer3@test.com",
    phoneNumber: generateEgyptPhone(),
    phoneNumberCountryCode: "EG",
    password: "Test@1234",
    confirmAccount: true,
  });

  return {
    customer,
    admin,
    customer2,
    customer3,
  };
}

/**
 * Create a single test customer with default credentials
 */
export async function createDefaultCustomer(): Promise<User> {
  return createCustomer({
    fullName: "Test Customer",
    email: `test-${Date.now()}@test.com`,
    phoneNumber: generateEgyptPhone(),
    phoneNumberCountryCode: "EG",
    password: "Test@1234",
    confirmAccount: true,
  });
}

/**
 * Create a single test admin with default credentials
 */
export async function createDefaultAdmin(): Promise<User> {
  // Create or get SUPER_ADMIN role
  const superAdminRole = await createSuperAdminRole();

  return createAdmin({
    fullName: "Test Admin",
    email: `admin-${Date.now()}@test.com`,
    phoneNumber: generateEgyptPhone(),
    phoneNumberCountryCode: "EG",
    password: "Admin@1234",
    confirmAccount: true,
    adminRole: superAdminRole,
  });
}
