import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "src/config/config.service";

describe("S3StorageService", () => {
  let service: any;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigValues: Record<string, string> = {
    s3AccessKey: "test-access-key",
    s3SecretKey: "test-secret-key",
    s3Region: "us-east-1",
    s3BucketName: "test-bucket",
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn((key: string) => mockConfigValues[key]),
    } as unknown as jest.Mocked<ConfigService>;

    // Dynamically import to handle the test environment detection
    const module = await import("./multer-config.service");
    service = new module.S3StorageService(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create service instance", () => {
      expect(service).toBeDefined();
    });

    it("should get S3 config from configService", () => {
      expect(configService.get).toHaveBeenCalledWith("s3AccessKey");
      expect(configService.get).toHaveBeenCalledWith("s3SecretKey");
      expect(configService.get).toHaveBeenCalledWith("s3Region");
      expect(configService.get).toHaveBeenCalledWith("s3BucketName");
    });
  });

  describe("multerOptions", () => {
    it("should return multer options with storage configuration", () => {
      const options = service.multerOptions("categories");

      expect(options).toHaveProperty("storage");
      expect(options).toHaveProperty("fileFilter");
      expect(options).toHaveProperty("limits");
    });

    it("should have correct file size limits", () => {
      const options = service.multerOptions("categories");

      expect(options.limits.fileSize).toBe(100 * 1024 * 1024); // 100MB
      expect(options.limits.files).toBe(20);
    });

    describe("fileFilter", () => {
      let fileFilter: any;

      beforeEach(() => {
        const options = service.multerOptions("categories");
        fileFilter = options.fileFilter;
      });

      it("should accept jpg images", () => {
        const file = { fieldname: "image", mimetype: "image/jpg" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it("should accept jpeg images", () => {
        const file = { fieldname: "image", mimetype: "image/jpeg" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it("should accept png images", () => {
        const file = { fieldname: "image", mimetype: "image/png" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it("should accept webp images", () => {
        const file = { fieldname: "image", mimetype: "image/webp" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it("should accept svg images", () => {
        const file = { fieldname: "image", mimetype: "image/svg+xml" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it("should accept mp4 videos", () => {
        const file = { fieldname: "video", mimetype: "video/mp4" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it("should accept webm videos", () => {
        const file = { fieldname: "video", mimetype: "video/webm" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it("should accept pdf files", () => {
        const file = { fieldname: "document", mimetype: "application/pdf" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(null, true);
      });

      it("should reject unsupported file types", () => {
        const file = { fieldname: "file", mimetype: "text/plain" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.any(BadRequestException),
          false,
        );
      });

      it("should include field name in error message for rejected files", () => {
        const file = { fieldname: "document", mimetype: "application/json" };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("document"),
          }),
          false,
        );
      });

      it("should include mimetype in error message for rejected files", () => {
        const file = {
          fieldname: "file",
          mimetype: "application/octet-stream",
        };
        const callback = jest.fn();

        fileFilter({}, file, callback);

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("application/octet-stream"),
          }),
          false,
        );
      });
    });
  });

  describe("validateFileSize", () => {
    it("should return true for valid image size", () => {
      const file = {
        mimetype: "image/jpeg",
        size: 1 * 1024 * 1024, // 1MB
        originalname: "test.jpg",
      };

      const result = service.validateFileSize(file);

      expect(result).toBe(true);
    });

    it("should throw BadRequestException for image exceeding 5MB", () => {
      const file = {
        mimetype: "image/jpeg",
        size: 6 * 1024 * 1024, // 6MB
        originalname: "large-image.jpg",
      };

      expect(() => service.validateFileSize(file)).toThrow(BadRequestException);
      expect(() => service.validateFileSize(file)).toThrow(/5MB/);
    });

    it("should return true for valid video size", () => {
      const file = {
        mimetype: "video/mp4",
        size: 50 * 1024 * 1024, // 50MB
        originalname: "test.mp4",
      };

      const result = service.validateFileSize(file);

      expect(result).toBe(true);
    });

    it("should throw BadRequestException for video exceeding 100MB", () => {
      const file = {
        mimetype: "video/mp4",
        size: 101 * 1024 * 1024, // 101MB
        originalname: "large-video.mp4",
      };

      expect(() => service.validateFileSize(file)).toThrow(BadRequestException);
      expect(() => service.validateFileSize(file)).toThrow(/100MB/);
    });

    it("should return true for valid PDF size", () => {
      const file = {
        mimetype: "application/pdf",
        size: 10 * 1024 * 1024, // 10MB
        originalname: "test.pdf",
      };

      const result = service.validateFileSize(file);

      expect(result).toBe(true);
    });

    it("should throw BadRequestException for PDF exceeding 50MB", () => {
      const file = {
        mimetype: "application/pdf",
        size: 51 * 1024 * 1024, // 51MB
        originalname: "large-document.pdf",
      };

      expect(() => service.validateFileSize(file)).toThrow(BadRequestException);
      expect(() => service.validateFileSize(file)).toThrow(/50MB/);
    });

    it("should throw BadRequestException for unsupported file type", () => {
      const file = {
        mimetype: "text/plain",
        size: 100,
        originalname: "text.txt",
      };

      expect(() => service.validateFileSize(file)).toThrow(BadRequestException);
      expect(() => service.validateFileSize(file)).toThrow(
        /unsupported file type/,
      );
    });

    it("should include original filename in error message", () => {
      const file = {
        mimetype: "image/jpeg",
        size: 10 * 1024 * 1024,
        originalname: "my-image.jpg",
      };

      expect(() => service.validateFileSize(file)).toThrow(/my-image.jpg/);
    });

    it("should accept webp images", () => {
      const file = {
        mimetype: "image/webp",
        size: 1 * 1024 * 1024,
        originalname: "test.webp",
      };

      expect(service.validateFileSize(file)).toBe(true);
    });

    it("should accept svg images", () => {
      const file = {
        mimetype: "image/svg+xml",
        size: 500 * 1024,
        originalname: "test.svg",
      };

      expect(service.validateFileSize(file)).toBe(true);
    });

    it("should accept various video formats", () => {
      const videoFormats = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/avi",
        "video/mov",
      ];

      for (const format of videoFormats) {
        const file = {
          mimetype: format,
          size: 50 * 1024 * 1024,
          originalname: `test.${format.split("/")[1]}`,
        };

        expect(service.validateFileSize(file)).toBe(true);
      }
    });
  });
});
