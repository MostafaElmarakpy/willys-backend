import { PermissionsMap } from "../../src/common/types/permission.types";
import { Role } from "../../src/database/entities/role.entity";
import { PREDEFINED_ROLES } from "../../src/modules/roles/constants/predefined-roles";
import { getRepository } from "../setup/test-app";

export interface CreateRoleOptions {
  name?: string;
  displayName?: string;
  description?: string;
  permissions?: PermissionsMap;
  isSystemRole?: boolean;
  isActive?: boolean;
}

/**
 * Create a role in the database
 */
export async function createRole(
  options: CreateRoleOptions = {},
): Promise<Role> {
  const roleRepo = getRepository<Role>(Role);

  const role = roleRepo.create({
    name: options.name || "CUSTOM_ROLE",
    displayName: options.displayName || "Custom Role",
    description: options.description || "Custom test role",
    permissions: options.permissions || {},
    isSystemRole: options.isSystemRole ?? false,
    isActive: options.isActive ?? true,
  });

  return roleRepo.save(role);
}

/**
 * Create SUPER_ADMIN role
 */
export async function createSuperAdminRole(): Promise<Role> {
  const roleRepo = getRepository<Role>(Role);

  // Check if SUPER_ADMIN role already exists
  const existingRole = await roleRepo.findOne({
    where: { name: "SUPER_ADMIN" },
  });

  if (existingRole) {
    return existingRole;
  }

  // Get SUPER_ADMIN role definition from predefined roles
  const superAdminRoleData = PREDEFINED_ROLES.find(
    (r) => r.name === "SUPER_ADMIN",
  );

  if (!superAdminRoleData) {
    throw new Error("SUPER_ADMIN role not found in predefined roles");
  }

  return createRole({
    name: superAdminRoleData.name,
    displayName: superAdminRoleData.displayName,
    description: superAdminRoleData.description,
    permissions: superAdminRoleData.permissions,
    isSystemRole: true,
    isActive: true,
  });
}

/**
 * Create all predefined roles
 */
export async function createPredefinedRoles(): Promise<Role[]> {
  const roles: Role[] = [];

  for (const roleData of PREDEFINED_ROLES) {
    const role = await createRole({
      name: roleData.name,
      displayName: roleData.displayName,
      description: roleData.description,
      permissions: roleData.permissions,
      isSystemRole: true,
      isActive: true,
    });
    roles.push(role);
  }

  return roles;
}
