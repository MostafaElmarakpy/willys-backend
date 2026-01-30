import { NotFoundException } from "@nestjs/common";
import { ConfigService } from "./config.service";

describe("ConfigService", () => {
  const originalEnv = process.env;

  const requiredEnvVars = {
    PORT: "3000",
    DATABASE_HOST: "localhost",
    DATABASE_PORT: "5432",
    DATABASE_NAME: "testdb",
    DATABASE_USERNAME: "testuser",
    DATABASE_PASSWORD: "testpassword",
    DATABASE_SYNCHRONIZE: "true",
    JWT_ACCESS_TOKEN_EXPIRES_IN: "15m",
    JWT_REFRESH_TOKEN_EXPIRES_IN: "7d",
    JWT_SECRET: "test-jwt-secret",
    POSTGRES_DB: "testdb",
    POSTGRES_USER: "postgres",
    POSTGRES_PASSWORD: "postgres",
    S3_ACCESS_KEY_ID: "test-access-key",
    S3_SECRET_KEY_ID: "test-secret-key",
    S3_BUCKET_NAME: "test-bucket",
    S3_REGION: "us-east-1",
    ROUND_CUBE_HOST: "mail.example.com",
    ROUND_CUBE_PORT: "465",
    ROUND_CUBE_USER: "mail@example.com",
    ROUND_CUBE_PASSWORD: "mailpassword",
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...requiredEnvVars };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should load configuration successfully when all required keys are present", () => {
      const configService = new ConfigService();

      expect(configService.get("port")).toBe(3000);
      expect(configService.get("databaseHost")).toBe("localhost");
    });

    it("should throw error when required environment variables are missing", () => {
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_HOST;

      expect(() => new ConfigService()).toThrow(
        "Missing required environment variables",
      );
    });

    it("should list all missing keys in error message", () => {
      delete process.env.JWT_SECRET;
      delete process.env.DATABASE_HOST;

      expect(() => new ConfigService()).toThrow(/JWT_SECRET/);
      expect(() => new ConfigService()).toThrow(/DATABASE_HOST/);
    });
  });

  describe("get", () => {
    let configService: ConfigService;

    beforeEach(() => {
      configService = new ConfigService();
    });

    it("should return port as number", () => {
      expect(configService.get("port")).toBe(3000);
    });

    it("should return database host as string", () => {
      expect(configService.get("databaseHost")).toBe("localhost");
    });

    it("should return database port as number", () => {
      expect(configService.get("databasePort")).toBe(5432);
    });

    it("should return database sync as boolean", () => {
      expect(configService.get("databaseSync")).toBe(true);
    });

    it("should return false for databaseSync when DATABASE_SYNCHRONIZE is not true", () => {
      process.env.DATABASE_SYNCHRONIZE = "false";
      const service = new ConfigService();

      expect(service.get("databaseSync")).toBe(false);
    });

    it("should return JWT secret", () => {
      expect(configService.get("jwtSecret")).toBe("test-jwt-secret");
    });

    it("should return JWT access expiration", () => {
      expect(configService.get("jwtAccessExpiration")).toBe("15m");
    });

    it("should return JWT refresh expiration", () => {
      expect(configService.get("jwtRefreshExpiration")).toBe("7d");
    });

    it("should return S3 configuration", () => {
      expect(configService.get("s3AccessKey")).toBe("test-access-key");
      expect(configService.get("s3SecretKey")).toBe("test-secret-key");
      expect(configService.get("s3BucketName")).toBe("test-bucket");
      expect(configService.get("s3Region")).toBe("us-east-1");
    });

    it("should return RoundCube mail configuration", () => {
      expect(configService.get("roundCubeHost")).toBe("mail.example.com");
      expect(configService.get("roundCubePort")).toBe(465);
      expect(configService.get("roundCubeUser")).toBe("mail@example.com");
      expect(configService.get("roundCubePassword")).toBe("mailpassword");
    });

    it("should throw NotFoundException for unknown key", () => {
      expect(() => configService.get("unknownKey")).toThrow(NotFoundException);
    });

    it("should throw NotFoundException with correct message", () => {
      expect(() => configService.get("invalidKey")).toThrow(
        'Configuration key "invalidKey" not found',
      );
    });

    it("should return Paymob configuration with defaults", () => {
      expect(configService.get("paymobApiKey")).toBe("");
      expect(configService.get("paymobSecretKey")).toBe("");
      expect(configService.get("paymobPublicKey")).toBe("");
    });

    it("should return Paymob configuration when set", () => {
      process.env.PAYMOB_API_KEY = "test-api-key";
      process.env.PAYMOB_SECRET_KEY = "test-secret-key";
      process.env.PAYMOB_PUBLIC_KEY = "test-public-key";
      process.env.PAYMOB_CREDIT_CARD_INTEGRATION_ID = "123";
      process.env.PAYMOB_IFRAME_ID = "456";

      const service = new ConfigService();

      expect(service.get("paymobApiKey")).toBe("test-api-key");
      expect(service.get("paymobSecretKey")).toBe("test-secret-key");
      expect(service.get("paymobPublicKey")).toBe("test-public-key");
      expect(service.get("paymobCreditCardIntegrationId")).toBe("123");
      expect(service.get("paymobIframeId")).toBe("456");
    });

    it("should return Firebase configuration with defaults", () => {
      expect(configService.get("firebaseProjectId")).toBe("");
      expect(configService.get("firebaseClientEmail")).toBe("");
      expect(configService.get("firebasePrivateKey")).toBe("");
    });

    it("should return Firebase configuration when set", () => {
      process.env.FIREBASE_PROJECT_ID = "test-project";
      process.env.FIREBASE_CLIENT_EMAIL = "firebase@test.com";
      process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN KEY-----\\ntest\\n-----END KEY-----";

      const service = new ConfigService();

      expect(service.get("firebaseProjectId")).toBe("test-project");
      expect(service.get("firebaseClientEmail")).toBe("firebase@test.com");
      expect(service.get("firebasePrivateKey")).toContain("-----BEGIN KEY-----");
    });

    it("should replace escaped newlines in Firebase private key", () => {
      process.env.FIREBASE_PRIVATE_KEY = "key\\nwith\\nnewlines";

      const service = new ConfigService();

      expect(service.get("firebasePrivateKey")).toBe("key\nwith\nnewlines");
    });
  });
});
