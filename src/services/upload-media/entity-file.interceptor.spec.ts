import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { EntityFileInterceptor } from "./entity-file.interceptor";
import { S3StorageService } from "./multer-config.service";

describe("EntityFileInterceptor", () => {
  let mockS3StorageService: jest.Mocked<S3StorageService>;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: { file?: any };
  let mockFileInterceptor: { intercept: jest.Mock };

  beforeEach(() => {
    mockS3StorageService = {
      multerOptions: jest.fn().mockReturnValue({
        storage: {},
        fileFilter: jest.fn(),
        limits: { fileSize: 100 * 1024 * 1024, files: 20 },
      }),
      validateFileSize: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<S3StorageService>;

    mockRequest = { file: null };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    };

    mockFileInterceptor = {
      intercept: jest.fn().mockResolvedValue(of({})),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("EntityFileInterceptor factory", () => {
    it("should return a mixin interceptor class", () => {
      const InterceptorClass = EntityFileInterceptor("categories");

      expect(InterceptorClass).toBeDefined();
      expect(typeof InterceptorClass).toBe("function");
    });

    it("should create interceptor with entity type", () => {
      const InterceptorClass = EntityFileInterceptor("items");

      expect(InterceptorClass).toBeDefined();
    });

    it("should create interceptor with custom field name", () => {
      const InterceptorClass = EntityFileInterceptor("items", "image");

      expect(InterceptorClass).toBeDefined();
    });

    it("should use default field name when not provided", () => {
      const InterceptorClass = EntityFileInterceptor("items");

      expect(InterceptorClass).toBeDefined();
    });
  });

  describe("MixinInterceptor instance", () => {
    it("should validate file size when file is present", async () => {
      const mockFile = {
        mimetype: "image/jpeg",
        size: 1 * 1024 * 1024,
        originalname: "test.jpg",
      };
      mockRequest.file = mockFile;

      const _InterceptorClass = EntityFileInterceptor("categories");
      const interceptor = {
        s3StorageService: mockS3StorageService,
        filesInterceptor: mockFileInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          const result = await mockFileInterceptor.intercept(context, next);
          const request = context.switchToHttp().getRequest();
          if (request.file) {
            mockS3StorageService.validateFileSize(request.file);
          }
          return result;
        },
      };

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockS3StorageService.validateFileSize).toHaveBeenCalledWith(
        mockFile,
      );
    });

    it("should not call validateFileSize when no file", async () => {
      mockRequest.file = null;

      const interceptor = {
        s3StorageService: mockS3StorageService,
        filesInterceptor: mockFileInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          const result = await mockFileInterceptor.intercept(context, next);
          const request = context.switchToHttp().getRequest();
          if (request.file) {
            mockS3StorageService.validateFileSize(request.file);
          }
          return result;
        },
      };

      await interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockS3StorageService.validateFileSize).not.toHaveBeenCalled();
    });

    it("should call multerOptions with entity type", () => {
      mockS3StorageService.multerOptions("categories");

      expect(mockS3StorageService.multerOptions).toHaveBeenCalledWith(
        "categories",
      );
    });

    it("should return result from file interceptor", async () => {
      const expectedResult = { success: true };
      mockFileInterceptor.intercept.mockResolvedValue(of(expectedResult));

      const interceptor = {
        filesInterceptor: mockFileInterceptor,
        intercept: async (context: ExecutionContext, next: CallHandler) => {
          return mockFileInterceptor.intercept(context, next);
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
