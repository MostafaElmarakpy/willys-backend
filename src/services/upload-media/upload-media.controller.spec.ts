import { Test, type TestingModule } from "@nestjs/testing";
import { UploadMediaController } from "./upload-media.controller";
import { S3StorageService } from "./multer-config.service";

describe("UploadMediaController", () => {
  let controller: UploadMediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadMediaController],
      providers: [
        {
          provide: S3StorageService,
          useValue: {
            multerOptions: jest.fn().mockReturnValue({}),
            validateFileSize: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UploadMediaController>(UploadMediaController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should be defined", () => {
      expect(controller).toBeDefined();
    });
  });

  describe("uploadFile", () => {
    it("should return success response when file is uploaded", async () => {
      const dto = { entityType: "item", entityId: "item-123" };

      const result = await controller.uploadFile(dto as any);

      expect(result.message).toBe("File uploaded successfully");
      expect(result.data).toEqual({});
    });
  });
});
