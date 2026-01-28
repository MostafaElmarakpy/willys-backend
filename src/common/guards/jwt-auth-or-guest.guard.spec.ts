import {
  type ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { UsersService } from "../../modules/users/users.service";
import { JwtAuthOrGuestGuard } from "./jwt-auth-or-guest.guard";

describe("JwtAuthOrGuestGuard", () => {
  let guard: JwtAuthOrGuestGuard;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthOrGuestGuard,
        {
          provide: UsersService,
          useValue: {
            validateUserToken: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthOrGuestGuard>(JwtAuthOrGuestGuard);
    usersService = module.get(UsersService);
  });

  const createMockExecutionContext = (
    headers: Record<string, string> = {},
  ): ExecutionContext => {
    const request = {
      headers,
      user: undefined as any,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  describe("canActivate", () => {
    it("should return true when no authorization header is present (guest mode)", async () => {
      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(usersService.validateUserToken).not.toHaveBeenCalled();
    });

    it("should return true and set user when valid token is provided", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      usersService.validateUserToken.mockResolvedValue(mockUser as any);
      const context = createMockExecutionContext({
        authorization: "Bearer valid-token",
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(usersService.validateUserToken).toHaveBeenCalledWith("valid-token");
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual(mockUser);
    });

    it("should throw UnauthorizedException when token is missing after Bearer", async () => {
      const context = createMockExecutionContext({
        authorization: "Bearer ",
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when user is not found", async () => {
      usersService.validateUserToken.mockResolvedValue(null as any);
      const context = createMockExecutionContext({
        authorization: "Bearer valid-token",
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when token validation fails", async () => {
      usersService.validateUserToken.mockRejectedValue(
        new Error("Token invalid"),
      );
      const context = createMockExecutionContext({
        authorization: "Bearer invalid-token",
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException when authorization header is not Bearer type", async () => {
      const context = createMockExecutionContext({
        authorization: "Basic some-credentials",
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should handle malformed authorization header", async () => {
      const context = createMockExecutionContext({
        authorization: "malformed",
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
