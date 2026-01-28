import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import { PermissionsGuard } from "./permissions.guard";

describe("PermissionsGuard", () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
  });

  const createMockExecutionContext = (user?: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  describe("canActivate", () => {
    it("should return true when no permissions are required", () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return true when permissions array is empty", () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({});

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return false when no user is present", () => {
      reflector.getAllAndOverride.mockReturnValue([
        { module: "users", action: "read" },
      ]);
      const context = createMockExecutionContext(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return true when user is SUPER_ADMIN", () => {
      reflector.getAllAndOverride.mockReturnValue([
        { module: "users", action: "read" },
      ]);
      const context = createMockExecutionContext({
        adminRole: { name: "SUPER_ADMIN" },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return true when user has the required permission", () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce([{ module: "users", action: "read" }])
        .mockReturnValueOnce("OR");
      const context = createMockExecutionContext({
        adminRole: {
          name: "Admin",
          permissions: { users: ["read", "write"] },
        },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should throw ForbiddenException when user lacks permission", () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce([{ module: "users", action: "delete" }])
        .mockReturnValueOnce("OR");
      const context = createMockExecutionContext({
        adminRole: {
          name: "Admin",
          permissions: { users: ["read"] },
        },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("should throw ForbiddenException when user has no permissions for module", () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce([{ module: "orders", action: "read" }])
        .mockReturnValueOnce("OR");
      const context = createMockExecutionContext({
        adminRole: {
          name: "Admin",
          permissions: { users: ["read"] },
        },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("should return true in OR mode when user has one of multiple permissions", () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce([
          { module: "users", action: "read" },
          { module: "orders", action: "read" },
        ])
        .mockReturnValueOnce("OR");
      const context = createMockExecutionContext({
        adminRole: {
          name: "Admin",
          permissions: { users: ["read"] },
        },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return true in AND mode when user has all permissions", () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce([
          { module: "users", action: "read" },
          { module: "orders", action: "read" },
        ])
        .mockReturnValueOnce("AND");
      const context = createMockExecutionContext({
        adminRole: {
          name: "Admin",
          permissions: {
            users: ["read"],
            orders: ["read"],
          },
        },
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should throw ForbiddenException in AND mode when user lacks one permission", () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce([
          { module: "users", action: "read" },
          { module: "orders", action: "read" },
        ])
        .mockReturnValueOnce("AND");
      const context = createMockExecutionContext({
        adminRole: {
          name: "Admin",
          permissions: { users: ["read"] },
        },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("should handle user with no adminRole", () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce([{ module: "users", action: "read" }])
        .mockReturnValueOnce("OR");
      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it("should handle user with adminRole but no permissions", () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce([{ module: "users", action: "read" }])
        .mockReturnValueOnce("OR");
      const context = createMockExecutionContext({
        adminRole: { name: "EmptyRole" },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
