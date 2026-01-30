import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "src/config/config.service";
import { FcmService } from "./fcm.service";

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn().mockReturnValue({
    messaging: jest.fn().mockReturnValue({
      send: jest.fn(),
    }),
  }),
  credential: {
    cert: jest.fn().mockReturnValue({}),
  },
}));

describe("FcmService", () => {
  let service: FcmService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FcmService>(FcmService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("should not initialize when credentials are missing", async () => {
      configService.get.mockReturnValue(undefined as any);

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(false);
    });

    it("should initialize when all credentials are provided", async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          firebaseProjectId: "project-id",
          firebaseClientEmail: "client@example.com",
          firebasePrivateKey: "private-key",
        };
        return config[key];
      });

      await service.onModuleInit();

      expect(service.isConfigured()).toBe(true);
    });
  });

  describe("isConfigured", () => {
    it("should return false when not initialized", () => {
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe("sendToToken", () => {
    it("should return failure when not initialized", async () => {
      const result = await service.sendToToken("token", {
        title: "Test",
        body: "Message",
      });

      expect(result.success).toBe(false);
      expect(result.shouldRemoveToken).toBe(false);
    });

    it("should send notification when initialized", async () => {
      // Initialize the service first
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          firebaseProjectId: "project-id",
          firebaseClientEmail: "client@example.com",
          firebasePrivateKey: "private-key",
        };
        return config[key];
      });
      await service.onModuleInit();

      const result = await service.sendToToken(
        "valid-token",
        { title: "Test", body: "Message" },
        { link: "/orders" },
      );

      expect(result.success).toBe(true);
    });

    it("should mark token for removal on invalid token error", async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          firebaseProjectId: "project-id",
          firebaseClientEmail: "client@example.com",
          firebasePrivateKey: "private-key",
        };
        return config[key];
      });
      await service.onModuleInit();

      // Mock messaging to throw invalid token error
      const admin = require("firebase-admin");
      admin.initializeApp().messaging().send.mockRejectedValueOnce({
        code: "messaging/invalid-registration-token",
        message: "Invalid token",
      });

      const result = await service.sendToToken("invalid-token", {
        title: "Test",
        body: "Message",
      });

      expect(result.success).toBe(false);
      expect(result.shouldRemoveToken).toBe(true);
    });
  });

  describe("sendToTokens", () => {
    it("should send to multiple tokens", async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          firebaseProjectId: "project-id",
          firebaseClientEmail: "client@example.com",
          firebasePrivateKey: "private-key",
        };
        return config[key];
      });
      await service.onModuleInit();

      const result = await service.sendToTokens(["token1", "token2"], {
        title: "Test",
        body: "Message",
      });

      expect(result.success).toBeDefined();
      expect(result.failed).toBeDefined();
      expect(result.tokensToRemove).toBeDefined();
    });

    it("should handle mixed results (success and failure)", async () => {
      configService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          firebaseProjectId: "project-id",
          firebaseClientEmail: "client@example.com",
          firebasePrivateKey: "private-key",
        };
        return config[key];
      });
      await service.onModuleInit();

      const admin = require("firebase-admin");
      admin
        .initializeApp()
        .messaging()
        .send.mockResolvedValueOnce("success")
        .mockRejectedValueOnce({
          code: "messaging/invalid-registration-token",
        });

      const result = await service.sendToTokens(["token1", "token2"], {
        title: "Test",
        body: "Message",
      });

      expect(result.success).toContain("token1");
      expect(result.tokensToRemove).toContain("token2");
    });
  });
});
