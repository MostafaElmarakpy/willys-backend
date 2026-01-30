import { UnauthorizedException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "src/config/config.service";
import { UsersService } from "src/modules/users/users.service";
import { JwtStrategy } from "./jwt.strategy";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let usersService: jest.Mocked<UsersService>;

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    fullName: "Test User",
    phoneNumber: "1234567890",
    phoneNumberCountryCode: "+20",
    role: "user",
  };

  const mockPayload = {
    id: "user-123",
    email: "test@example.com",
    fullName: "Test User",
    phoneNumber: "1234567890",
    phoneNumberCountryCode: "+20",
    role: "user",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("test-jwt-secret"),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("should return user when valid token payload", async () => {
      usersService.findOne.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(mockPayload);

      expect(usersService.findOne).toHaveBeenCalledWith(mockPayload.id);
      expect(result).toEqual(mockUser);
    });

    it("should throw UnauthorizedException when user not found", async () => {
      usersService.findOne.mockResolvedValue(null as any);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException with correct message", async () => {
      usersService.findOne.mockResolvedValue(null as any);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        "Invalid token",
      );
    });
  });
});
