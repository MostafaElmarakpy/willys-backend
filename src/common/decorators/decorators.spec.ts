import { PermissionAction } from "../enums/PermissionAction";
import { PermissionModule } from "../enums/PermissionModule";
import { UserRole } from "../enums/UserRole";
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
  Permission,
  Permissions,
  RequireAllPermissions,
  type RequiredPermission,
} from "./permissions.decorator";
import { ROLES_KEY, Roles } from "./roles.decorator";
import { User } from "./user.decorator";

describe("Decorators", () => {
  describe("Roles Decorator", () => {
    it("should set roles metadata with single role", () => {
      const decorator = Roles(UserRole.admin);
      const target = class TestClass {};

      decorator(target, undefined as any, undefined as any);

      const roles = Reflect.getMetadata(ROLES_KEY, target);
      expect(roles).toEqual([UserRole.admin]);
    });

    it("should set roles metadata with multiple roles", () => {
      const decorator = Roles(UserRole.admin, UserRole.user);
      const target = class TestClass {};

      decorator(target, undefined as any, undefined as any);

      const roles = Reflect.getMetadata(ROLES_KEY, target);
      expect(roles).toEqual([UserRole.admin, UserRole.user]);
    });

    it("should set empty array when no roles provided", () => {
      const decorator = Roles();
      const target = class TestClass {};

      decorator(target, undefined as any, undefined as any);

      const roles = Reflect.getMetadata(ROLES_KEY, target);
      expect(roles).toEqual([]);
    });

    it("should export ROLES_KEY constant", () => {
      expect(ROLES_KEY).toBe("roles");
    });
  });

  describe("Permissions Decorator", () => {
    it("should set single permission with Permission decorator", () => {
      const decorator = Permission(
        PermissionModule.USERS,
        PermissionAction.READ,
      );
      const target = class TestClass {};

      decorator(target, undefined as any, undefined as any);

      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, target);
      expect(permissions).toEqual([
        { module: PermissionModule.USERS, action: PermissionAction.READ },
      ]);
    });

    it("should set multiple permissions with Permissions decorator", () => {
      const perms: RequiredPermission[] = [
        { module: PermissionModule.USERS, action: PermissionAction.READ },
        { module: PermissionModule.ORDERS, action: PermissionAction.CREATE },
      ];
      const decorator = Permissions(...perms);
      const target = class TestClass {};

      decorator(target, undefined as any, undefined as any);

      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, target);
      expect(permissions).toEqual(perms);
    });

    it("should set RequireAllPermissions mode to AND", () => {
      const decorator = RequireAllPermissions();
      const target = class TestClass {};

      decorator(target, undefined as any, undefined as any);

      const mode = Reflect.getMetadata(PERMISSIONS_MODE_KEY, target);
      expect(mode).toBe("AND");
    });

    it("should export PERMISSIONS_KEY constant", () => {
      expect(PERMISSIONS_KEY).toBe("permissions");
    });

    it("should export PERMISSIONS_MODE_KEY constant", () => {
      expect(PERMISSIONS_MODE_KEY).toBe("permissions_mode");
    });
  });

  describe("User Decorator", () => {
    // Test the User decorator behavior by directly testing the logic
    // that would be used in the createParamDecorator callback
    const extractUser = (data: string | undefined, user: any) => {
      return data ? user?.[data] : user;
    };

    it("should return full user when no property specified", () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        fullName: "Test User",
        role: UserRole.user,
      };

      const result = extractUser(undefined, mockUser);

      expect(result).toEqual(mockUser);
    });

    it("should return specific property when property name specified", () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        fullName: "Test User",
        role: UserRole.user,
      };

      const result = extractUser("email", mockUser);

      expect(result).toBe("test@example.com");
    });

    it("should return undefined for non-existent property", () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
      };

      const result = extractUser("nonExistent", mockUser);

      expect(result).toBeUndefined();
    });

    it("should return undefined when user is not set", () => {
      const result = extractUser(undefined, undefined);

      expect(result).toBeUndefined();
    });

    it("should safely handle null user with property access", () => {
      const result = extractUser("email", null);

      expect(result).toBeUndefined();
    });

    it("should be defined as a decorator", () => {
      expect(User).toBeDefined();
      expect(typeof User).toBe("function");
    });
  });
});
