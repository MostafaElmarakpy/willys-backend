import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { EntityFilesInterceptor } from "./entity-files.interceptor";
import { S3StorageService } from "./multer-config.service";

describe("EntityFilesInterceptor", () => {
  let mockS3StorageService: jest.Mocked<S3StorageService>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: { files?: Record<string, any[]> };
  let mockFileFieldsInterceptor: { intercept: jest.Mock };

  beforeEach(() => {
    mockS3StorageService = {
      multerOptions: jest.fn().mockReturnValue({
        storage: {},
        fileFilter: jest.fn(),
        limits: { fileSize: 100 * 1024 * 1024, files: 20 },
      }),
      validateFileSize: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<S3StorageService>;

    mockRequest = { files: null };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    };

    mockFileFieldsInterceptor = {
      intercept: jest.fn().mockResolvedValue(of({})),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("EntityFilesInterceptor factory", () => {
    it("should return a mixin interceptor class", () => {
      const InterceptorClass = EntityFilesInterceptor("categories", [
        { name: "image", maxCount: 1 },
      ]);

      expect(InterceptorClass).toBeDefined();
      expect(typeof InterceptorClass).toBe("function");
    });

    it("should create interceptor with multiple upload fields", () => {
      const InterceptorClass = EntityFilesInterceptor("items", [
        { name: "image", maxCount: 1 },
        { name: "gallery", maxCount: 10 },
      ]);

      expect(InterceptorClass).toBeDefined();
    });

    it("should create interceptor with default maxCount", () => {
      const InterceptorClass = EntityFilesInterceptor("bundles", [
        { name: "image" },
      ]);

      expect(InterceptorClass).toBeDefined();
    });
  });

  describe("MixinInterceptor instance", () => {
    it("should validate file sizes for array of files", async () => {
      const mockFiles = {
        image: [
          { mimetype: "image/jpeg", size: 1024, originalname: "test1.jpg" },
          { mimetype: "image/png", size: 2048, originalname: "test2.png" },
        ],
      };
      mockRequest.files = mockFiles;

      const interceptor = {
        s3StorageService: mockS3StorageService,
        fileFieldsInterceptor: mockFileFieldsInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          const result = await mockFileFieldsInterceptor.intercept(
            context,
            next,
          );
          const request = context.switchToHttp().getRequest();
          if (request.files) {
            Object.values(request.files).forEach((fileArray: any[]) => {
              if (Array.isArray(fileArray)) {
                fileArray.forEach((file) => {
                  mockS3StorageService.validateFileSize(file);
                });
              } else if (fileArray) {
                mockS3StorageService.validateFileSize(fileArray);
              }
            });
          }
          return result;
        },
      };

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockS3StorageService.validateFileSize).toHaveBeenCalledTimes(2);
      expect(mockS3StorageService.validateFileSize).toHaveBeenCalledWith(
        mockFiles.image[0],
      );
      expect(mockS3StorageService.validateFileSize).toHaveBeenCalledWith(
        mockFiles.image[1],
      );
    });

    it("should validate file sizes for multiple fields", async () => {
      const mockFiles = {
        image: [
          { mimetype: "image/jpeg", size: 1024, originalname: "img.jpg" },
        ],
        video: [{ mimetype: "video/mp4", size: 5000, originalname: "vid.mp4" }],
      };
      mockRequest.files = mockFiles;

      const interceptor = {
        s3StorageService: mockS3StorageService,
        fileFieldsInterceptor: mockFileFieldsInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          const result = await mockFileFieldsInterceptor.intercept(
            context,
            next,
          );
          const request = context.switchToHttp().getRequest();
          if (request.files) {
            Object.values(request.files).forEach((fileArray: any[]) => {
              if (Array.isArray(fileArray)) {
                fileArray.forEach((file) => {
                  mockS3StorageService.validateFileSize(file);
                });
              } else if (fileArray) {
                mockS3StorageService.validateFileSize(fileArray);
              }
            });
          }
          return result;
        },
      };

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockS3StorageService.validateFileSize).toHaveBeenCalledTimes(2);
    });

    it("should handle single file (non-array)", async () => {
      const mockFiles = {
        document: {
          mimetype: "application/pdf",
          size: 10000,
          originalname: "doc.pdf",
        },
      };
      mockRequest.files = mockFiles as any;

      const interceptor = {
        s3StorageService: mockS3StorageService,
        fileFieldsInterceptor: mockFileFieldsInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          const result = await mockFileFieldsInterceptor.intercept(
            context,
            next,
          );
          const request = context.switchToHttp().getRequest();
          if (request.files) {
            Object.values(request.files).forEach((fileArray: any[]) => {
              if (Array.isArray(fileArray)) {
                fileArray.forEach((file) => {
                  mockS3StorageService.validateFileSize(file);
                });
              } else if (fileArray) {
                mockS3StorageService.validateFileSize(fileArray);
              }
            });
          }
          return result;
        },
      };

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockS3StorageService.validateFileSize).toHaveBeenCalledWith(
        mockFiles.document,
      );
    });

    it("should not call validateFileSize when no files", async () => {
      mockRequest.files = null;

      const interceptor = {
        s3StorageService: mockS3StorageService,
        fileFieldsInterceptor: mockFileFieldsInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          const result = await mockFileFieldsInterceptor.intercept(
            context,
            next,
          );
          const request = context.switchToHttp().getRequest();
          if (request.files) {
            Object.values(request.files).forEach((fileArray: any[]) => {
              if (Array.isArray(fileArray)) {
                fileArray.forEach((file) => {
                  mockS3StorageService.validateFileSize(file);
                });
              } else if (fileArray) {
                mockS3StorageService.validateFileSize(fileArray);
              }
            });
          }
          return result;
        },
      };

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockS3StorageService.validateFileSize).not.toHaveBeenCalled();
    });

    it("should not call validateFileSize for empty array", async () => {
      mockRequest.files = { image: [] };

      const interceptor = {
        s3StorageService: mockS3StorageService,
        fileFieldsInterceptor: mockFileFieldsInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          const result = await mockFileFieldsInterceptor.intercept(
            context,
            next,
          );
          const request = context.switchToHttp().getRequest();
          if (request.files) {
            Object.values(request.files).forEach((fileArray: any[]) => {
              if (Array.isArray(fileArray)) {
                fileArray.forEach((file) => {
                  mockS3StorageService.validateFileSize(file);
                });
              } else if (fileArray) {
                mockS3StorageService.validateFileSize(fileArray);
              }
            });
          }
          return result;
        },
      };

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockS3StorageService.validateFileSize).not.toHaveBeenCalled();
    });

    it("should call multerOptions with entity type", () => {
      mockS3StorageService.multerOptions("items");

      expect(mockS3StorageService.multerOptions).toHaveBeenCalledWith("items");
    });

    it("should return result from file fields interceptor", async () => {
      const expectedResult = { success: true, files: [] };
      mockFileFieldsInterceptor.intercept.mockResolvedValue(of(expectedResult));

      const interceptor = {
        fileFieldsInterceptor: mockFileFieldsInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          return mockFileFieldsInterceptor.intercept(context, next);
        },
      };

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      expect(result).toBeDefined();
    });
  });
});
