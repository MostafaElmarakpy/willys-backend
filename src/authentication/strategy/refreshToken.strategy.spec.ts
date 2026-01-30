import { RefreshJwtStrategy } from "./refreshToken.strategy";
import { ConfigService } from "src/config/config.service";

describe("RefreshJwtStrategy", () => {
  let strategy: RefreshJwtStrategy;

  const mockPayload = {
    id: "user-123",
    email: "test@example.com",
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue("test-jwt-secret"),
  } as unknown as ConfigService;

  beforeEach(() => {
    strategy = new RefreshJwtStrategy(mockConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("should return user id and username from payload", async () => {
      const result = await strategy.validate(mockPayload);

      expect(result).toEqual({
        user: mockPayload.id,
        username: mockPayload.email,
      });
    });

    it("should handle different payload formats", async () => {
      const alternativePayload = {
        id: "different-user",
        email: "other@example.com",
      };

      const result = await strategy.validate(alternativePayload);

      expect(result).toEqual({
        user: "different-user",
        username: "other@example.com",
      });
    });
  });
});
