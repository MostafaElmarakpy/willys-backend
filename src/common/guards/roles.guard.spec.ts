import { type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import { UserRole } from "../enums/UserRole";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
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
    it("should return true when no roles are required", () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: UserRole.user });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return true when user has matching role", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.admin]);
      const context = createMockExecutionContext({ role: UserRole.admin });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return false when user has non-matching role", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.admin]);
      const context = createMockExecutionContext({ role: UserRole.user });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return false when no user is present", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.admin]);
      const context = createMockExecutionContext(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return true when user role matches one of multiple required roles", () => {
      reflector.getAllAndOverride.mockReturnValue([
        UserRole.admin,
        UserRole.user,
      ]);
      const context = createMockExecutionContext({ role: UserRole.user });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it("should return false when user role does not match required role", () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.admin]);
      const context = createMockExecutionContext({ role: UserRole.user });

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it("should return true when required roles is an empty array", () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({ role: UserRole.user });

      const result = guard.canActivate(context);

      expect(result).toBe(false); // empty array with .some() returns false
    });
  });
});
