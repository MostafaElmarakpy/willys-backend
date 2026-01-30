import { UnauthorizedException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { AuthenticationService } from "../authentication.service";
import { LocalStrategy } from "./local.strategy";

describe("LocalStrategy", () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthenticationService>;

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    fullName: "Test User",
    phoneNumber: "1234567890",
    role: "user",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthenticationService,
          useValue: {
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthenticationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("should return user when credentials are valid", async () => {
      authService.validateUser.mockResolvedValue(mockUser as any);

      const result = await strategy.validate("test@example.com", "password123");

      expect(authService.validateUser).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      );
      expect(result).toEqual(mockUser);
    });

    it("should throw UnauthorizedException when credentials are invalid", async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate("test@example.com", "wrongpassword"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException with correct message", async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate("test@example.com", "wrongpassword"),
      ).rejects.toThrow("Invalid credentials.");
    });

    it("should validate with phone number as identifier", async () => {
      authService.validateUser.mockResolvedValue(mockUser as any);

      const result = await strategy.validate("+201234567890", "password123");

      expect(authService.validateUser).toHaveBeenCalledWith(
        "+201234567890",
        "password123",
      );
      expect(result).toEqual(mockUser);
    });
  });
});
