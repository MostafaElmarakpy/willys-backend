import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { ConfigService } from "../../config/config.service";
import { UploadMedia } from "./entities/upload-media.entity";
import { UploadMediaService } from "./upload-media.service";

// Mock @aws-sdk/client-s3
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  DeleteObjectCommand: jest.fn().mockImplementation((params) => params),
  PutBucketCorsCommand: jest.fn().mockImplementation((params) => params),
}));

describe("UploadMediaService", () => {
  let service: UploadMediaService;
  let filesRepository: jest.Mocked<Repository<UploadMedia>>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        s3AccessKey: "test-access-key",
        s3SecretKey: "test-secret-key",
        s3Region: "us-east-1",
        s3BucketName: "test-bucket",
      };
      return config[key];
    }),
  };

  const mockFile: Partial<UploadMedia> = {
    id: "file-123",
    url: "https://test-bucket.s3.amazonaws.com/uploads/test.jpg",
    filename: "uploads/test.jpg",
    path: "uploads/test.jpg",
    mimetype: "image/jpeg",
    size: 1024,
    entityType: "product",
    entityId: "product-123",
  };

  const mockMulterFile = {
    location: "https://test-bucket.s3.amazonaws.com/uploads/test.jpg",
    key: "uploads/test.jpg",
    mimetype: "image/jpeg",
    size: 1024,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadMediaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(UploadMedia),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UploadMediaService>(UploadMediaService);
    filesRepository = module.get(getRepositoryToken(UploadMedia));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("saveFileData", () => {
    it("should save file data to database", async () => {
      filesRepository.create.mockReturnValue(mockFile as UploadMedia);
      filesRepository.save.mockResolvedValue(mockFile as UploadMedia);

      const result = await service.saveFileData(
        mockMulterFile,
        "product",
        "product-123",
      );

      expect(filesRepository.create).toHaveBeenCalledWith({
        url: mockMulterFile.location,
        filename: mockMulterFile.key,
        path: mockMulterFile.key,
        mimetype: mockMulterFile.mimetype,
        size: mockMulterFile.size,
        entityType: "product",
        entityId: "product-123",
      });
      expect(filesRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockFile);
    });

    it("should throw error when file is required but not provided", async () => {
      await expect(
        service.saveFileData(null, "product", "product-123", true),
      ).rejects.toThrow("File is required");
    });

    it("should not throw when file is not required and not provided", async () => {
      filesRepository.create.mockReturnValue(mockFile as UploadMedia);
      filesRepository.save.mockResolvedValue(mockFile as UploadMedia);

      // When file is provided, it should still save
      const result = await service.saveFileData(
        mockMulterFile,
        "product",
        "product-123",
        false,
      );

      expect(result).toEqual(mockFile);
    });
  });

  describe("saveOneFile", () => {
    it("should save single file from array", async () => {
      filesRepository.create.mockReturnValue(mockFile as UploadMedia);
      filesRepository.save.mockResolvedValue(mockFile as UploadMedia);

      const result = await service.saveOneFile(
        [mockMulterFile as any],
        "product",
        "product-123",
      );

      expect(result).toEqual(mockFile);
    });

    it("should save single file directly", async () => {
      filesRepository.create.mockReturnValue(mockFile as UploadMedia);
      filesRepository.save.mockResolvedValue(mockFile as UploadMedia);

      const result = await service.saveOneFile(
        mockMulterFile as any,
        "product",
        "product-123",
      );

      expect(result).toEqual(mockFile);
    });

    it("should return undefined when no file provided", async () => {
      const result = await service.saveOneFile(
        undefined,
        "product",
        "product-123",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("saveFiles", () => {
    it("should save multiple files from array", async () => {
      const mockFile2 = { ...mockFile, id: "file-456" };
      filesRepository.create
        .mockReturnValueOnce(mockFile as UploadMedia)
        .mockReturnValueOnce(mockFile2 as UploadMedia);
      filesRepository.save
        .mockResolvedValueOnce(mockFile as UploadMedia)
        .mockResolvedValueOnce(mockFile2 as UploadMedia);

      const result = await service.saveFiles(
        [mockMulterFile as any, mockMulterFile as any],
        "product",
        "product-123",
      );

      expect(Array.isArray(result)).toBe(true);
      expect((result as UploadMedia[]).length).toBe(2);
    });

    it("should save single file when not array", async () => {
      filesRepository.create.mockReturnValue(mockFile as UploadMedia);
      filesRepository.save.mockResolvedValue(mockFile as UploadMedia);

      const result = await service.saveFiles(
        mockMulterFile as any,
        "product",
        "product-123",
      );

      expect(result).toEqual(mockFile);
    });

    it("should return undefined when no file provided", async () => {
      const result = await service.saveFiles(
        undefined,
        "product",
        "product-123",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("deleteFile", () => {
    it("should return false when no identifier provided", async () => {
      const result = await service.deleteFile(undefined);

      expect(result).toBe(false);
    });

    it("should delete file by URL", async () => {
      filesRepository.findOne.mockResolvedValue(mockFile as UploadMedia);
      filesRepository.remove.mockResolvedValue(mockFile as UploadMedia);

      const result = await service.deleteFile(
        "https://test-bucket.s3.us-east-1.amazonaws.com/uploads/test.jpg",
      );

      expect(result).toBe(true);
    });

    it("should delete file by S3 key (path)", async () => {
      filesRepository.findOne.mockResolvedValue(mockFile as UploadMedia);
      filesRepository.remove.mockResolvedValue(mockFile as UploadMedia);

      const result = await service.deleteFile("uploads/test.jpg");

      expect(result).toBe(true);
    });

    it("should delete file by ID", async () => {
      filesRepository.findOne.mockResolvedValue(mockFile as UploadMedia);
      filesRepository.remove.mockResolvedValue(mockFile as UploadMedia);

      const result = await service.deleteFile("file-123");

      expect(result).toBe(true);
    });

    it("should return false when file not found by ID and no path available", async () => {
      filesRepository.findOne.mockResolvedValue(null);

      const result = await service.deleteFile("unknown-id");

      expect(result).toBe(false);
    });

    it("should delete from S3 without removing from DB when removeFromDb is false", async () => {
      const result = await service.deleteFile("uploads/test.jpg", false);

      expect(result).toBe(true);
      expect(filesRepository.findOne).not.toHaveBeenCalled();
    });

    it("should return false on S3 delete error", async () => {
      // Mock S3 send to throw error
      const s3SendMock = jest.fn().mockRejectedValue(new Error("S3 Error"));
      (service as any).s3.send = s3SendMock;

      filesRepository.findOne.mockResolvedValue(mockFile as UploadMedia);

      const result = await service.deleteFile("uploads/test.jpg");

      expect(result).toBe(false);
    });
  });

  describe("deleteFiles", () => {
    it("should delete multiple files", async () => {
      // Mock successful deletions
      jest.spyOn(service, "deleteFile").mockResolvedValue(true);

      const result = await service.deleteFiles(["file-1", "file-2", "file-3"]);

      expect(result.success).toEqual(["file-1", "file-2", "file-3"]);
      expect(result.failed).toEqual([]);
    });

    it("should track failed deletions", async () => {
      jest
        .spyOn(service, "deleteFile")
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.deleteFiles(["file-1", "file-2", "file-3"]);

      expect(result.success).toEqual(["file-1", "file-3"]);
      expect(result.failed).toEqual(["file-2"]);
    });
  });

  describe("deleteFilesByEntity", () => {
    it("should delete all files for an entity", async () => {
      const files = [
        { ...mockFile, id: "file-1" },
        { ...mockFile, id: "file-2" },
      ] as UploadMedia[];

      filesRepository.find.mockResolvedValue(files);
      jest.spyOn(service, "deleteFiles").mockResolvedValue({
        success: ["file-1", "file-2"],
        failed: [],
      });

      const result = await service.deleteFilesByEntity(
        "product",
        "product-123",
      );

      expect(filesRepository.find).toHaveBeenCalledWith({
        where: { entityType: "product", entityId: "product-123" },
      });
      expect(result).toBe(true);
    });

    it("should return true when no files found", async () => {
      filesRepository.find.mockResolvedValue([]);

      const result = await service.deleteFilesByEntity(
        "product",
        "product-123",
      );

      expect(result).toBe(true);
    });

    it("should return false when some deletions fail", async () => {
      const files = [
        { ...mockFile, id: "file-1" },
        { ...mockFile, id: "file-2" },
      ] as UploadMedia[];

      filesRepository.find.mockResolvedValue(files);
      jest.spyOn(service, "deleteFiles").mockResolvedValue({
        success: ["file-1"],
        failed: ["file-2"],
      });

      const result = await service.deleteFilesByEntity(
        "product",
        "product-123",
      );

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      filesRepository.find.mockRejectedValue(new Error("DB Error"));

      const result = await service.deleteFilesByEntity(
        "product",
        "product-123",
      );

      expect(result).toBe(false);
    });
  });

  describe("private extractS3KeyFromUrl", () => {
    it("should extract key from bucket subdomain URL", () => {
      const url =
        "https://test-bucket.s3.us-east-1.amazonaws.com/uploads/test.jpg";
      const result = (service as any).extractS3KeyFromUrl(url);

      expect(result).toBe("uploads/test.jpg");
    });

    it("should extract key from path-style URL", () => {
      const url =
        "https://s3.us-east-1.amazonaws.com/test-bucket/uploads/test.jpg";
      const result = (service as any).extractS3KeyFromUrl(url);

      expect(result).toBe("uploads/test.jpg");
    });

    it("should return null for invalid URL", () => {
      const result = (service as any).extractS3KeyFromUrl("not-a-url");

      expect(result).toBeNull();
    });

    it("should return null for non-S3 URL", () => {
      const url = "https://example.com/uploads/test.jpg";
      const result = (service as any).extractS3KeyFromUrl(url);

      expect(result).toBeNull();
    });
  });
});
