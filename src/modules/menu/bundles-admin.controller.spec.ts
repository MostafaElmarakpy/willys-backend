import { Test, type TestingModule } from "@nestjs/testing";
import { S3StorageService } from "../../services/upload-media/multer-config.service";
import { BundlesService } from "./bundles.service";
import { BundlesAdminController } from "./bundles-admin.controller";

describe("BundlesAdminController", () => {
  let controller: BundlesAdminController;
  let bundlesService: jest.Mocked<BundlesService>;

  const mockUserId = "admin-123";
  const mockBundleId = "bundle-123";
  const mockCategoryId = "category-123";

  const mockBundle = {
    id: mockBundleId,
    name: { en: "Family Meal", ar: "وجبة عائلية" },
    price: 150,
    status: "active",
    items: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BundlesAdminController],
      providers: [
        {
          provide: BundlesService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByCategory: jest.fn(),
            duplicate: jest.fn(),
            archiveBundle: jest.fn(),
          },
        },
        {
          provide: S3StorageService,
          useValue: {
            multerOptions: jest.fn().mockReturnValue({}),
            validateFileSize: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BundlesAdminController>(BundlesAdminController);
    bundlesService = module.get(BundlesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated bundles", async () => {
      const paginatedResult = {
        bundles: [mockBundle],
        total: 1,
        page: 1,
        limit: 10,
      };
      bundlesService.findAll.mockResolvedValue(paginatedResult as any);

      const filterDto = { page: 1, limit: 10 };
      const result = await controller.findAll(filterDto);

      expect(bundlesService.findAll).toHaveBeenCalledWith(filterDto);
      expect(result.message).toBe("Bundles retrieved successfully");
    });
  });

  describe("create", () => {
    it("should create a bundle with images", async () => {
      const createDto = {
        name: { en: "New Bundle" },
        price: 200,
      } as any;
      const files = {
        image: [{ fieldname: "image", originalname: "bundle.jpg" }],
      } as any;
      bundlesService.create.mockResolvedValue(mockBundle as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.create(files, createDto, mockReq);

      expect(bundlesService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
        files,
      );
      expect(result.message).toBe("Bundle created successfully");
    });
  });

  describe("findOne", () => {
    it("should return bundle by id", async () => {
      bundlesService.findOne.mockResolvedValue(mockBundle as any);

      const result = await controller.findOne(mockBundleId);

      expect(bundlesService.findOne).toHaveBeenCalledWith(mockBundleId);
      expect(result.message).toBe("Bundle retrieved successfully");
    });
  });

  describe("update", () => {
    it("should update a bundle", async () => {
      const updateDto = { price: 175 } as any;
      const files = {} as any;
      const updatedBundle = { ...mockBundle, price: 175 };
      bundlesService.update.mockResolvedValue(updatedBundle as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.update(
        files,
        mockBundleId,
        updateDto,
        mockReq,
      );

      expect(bundlesService.update).toHaveBeenCalledWith(
        mockBundleId,
        updateDto,
        mockUserId,
        files,
      );
      expect(result.message).toBe("Bundle updated successfully");
    });
  });

  describe("remove", () => {
    it("should delete a bundle", async () => {
      bundlesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockBundleId);

      expect(bundlesService.remove).toHaveBeenCalledWith(mockBundleId);
      expect(result.message).toBe("Bundle deleted successfully");
    });
  });

  describe("findByCategory", () => {
    it("should return bundles by category", async () => {
      bundlesService.findByCategory.mockResolvedValue([mockBundle] as any);

      const result = await controller.findByCategory(mockCategoryId);

      expect(bundlesService.findByCategory).toHaveBeenCalledWith(
        mockCategoryId,
      );
      expect(result.message).toBe("Category bundles retrieved successfully");
    });
  });

  describe("duplicate", () => {
    it("should duplicate a bundle", async () => {
      const duplicatedBundle = { ...mockBundle, id: "bundle-copy" };
      bundlesService.duplicate.mockResolvedValue(duplicatedBundle as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.duplicate(mockBundleId, mockReq);

      expect(bundlesService.duplicate).toHaveBeenCalledWith(
        mockBundleId,
        mockUserId,
      );
      expect(result.message).toBe("Bundle duplicated successfully");
    });
  });

  describe("archive", () => {
    it("should archive a bundle", async () => {
      const archivedBundle = { ...mockBundle, status: "archived" };
      bundlesService.archiveBundle.mockResolvedValue(archivedBundle as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.archive(mockBundleId, mockReq);

      expect(bundlesService.archiveBundle).toHaveBeenCalledWith(
        mockBundleId,
        mockUserId,
      );
      expect(result.message).toBe("Bundle archived successfully");
    });
  });
});
