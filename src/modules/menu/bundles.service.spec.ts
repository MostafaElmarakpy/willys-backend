import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BundleStatus } from "src/common/enums/BundleStatus";
import { Bundle } from "src/database/entities/bundle.entity";
import { BundleComponent } from "src/database/entities/bundle-component.entity";
import { BundleComponentItem } from "src/database/entities/bundle-component-item.entity";
import { UploadMediaService } from "src/services/upload-media/upload-media.service";
import { BundlesService } from "./bundles.service";

describe("BundlesService", () => {
  let service: BundlesService;
  let bundleRepository: any;
  let bundleComponentRepository: any;
  let _bundleComponentItemRepository: any;
  let uploadMediaService: jest.Mocked<UploadMediaService>;

  const mockUserId = "user-123";
  const mockBundleId = "bundle-123";
  const mockCategoryId = "category-123";

  const mockBundle = {
    id: mockBundleId,
    name: { en: "Test Bundle", ar: "حزمة اختبار" },
    description: { en: "Description", ar: "وصف" },
    image: "test-image.jpg",
    categoryId: mockCategoryId,
    price: 99.99,
    status: BundleStatus.ACTIVE,
    extras: [],
    tags: [],
    components: [],
    createdBy: mockUserId,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockTransactionManager = {
    save: jest
      .fn()
      .mockImplementation((_entity, data) => Promise.resolve(data)),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BundlesService,
        {
          provide: getRepositoryToken(Bundle),
          useValue: {
            create: jest
              .fn()
              .mockImplementation((data) => ({ ...data, id: mockBundleId })),
            save: jest.fn().mockResolvedValue(mockBundle),
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            query: jest.fn(),
            manager: {
              transaction: jest
                .fn()
                .mockImplementation((cb) => cb(mockTransactionManager)),
            },
          },
        },
        {
          provide: getRepositoryToken(BundleComponent),
          useValue: {
            create: jest
              .fn()
              .mockImplementation((data) => ({ ...data, id: "component-123" })),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BundleComponentItem),
          useValue: {
            create: jest
              .fn()
              .mockImplementation((data) => ({ ...data, id: "item-123" })),
            save: jest.fn(),
          },
        },
        {
          provide: UploadMediaService,
          useValue: {
            saveOneFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BundlesService>(BundlesService);
    bundleRepository = module.get(getRepositoryToken(Bundle));
    bundleComponentRepository = module.get(getRepositoryToken(BundleComponent));
    _bundleComponentItemRepository = module.get(
      getRepositoryToken(BundleComponentItem),
    );
    uploadMediaService = module.get(UploadMediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a bundle without components", async () => {
      const createDto = {
        name: { en: "New Bundle", ar: "حزمة جديدة" },
        description: { en: "Description", ar: "وصف" },
        categoryId: mockCategoryId,
        price: 99.99,
      };

      mockTransactionManager.save.mockResolvedValue({
        ...mockBundle,
        ...createDto,
      });

      const result = await service.create(createDto as any, mockUserId, {});

      expect(bundleRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should create a bundle with components and items", async () => {
      const createDto = {
        name: { en: "New Bundle", ar: "حزمة جديدة" },
        description: { en: "Description", ar: "وصف" },
        categoryId: mockCategoryId,
        price: 99.99,
        components: [
          {
            categoryId: "cat-123",
            defaultItemId: "item-123",
            quantity: 1,
            items: [{ itemId: "item-123", extraCost: 0 }],
          },
        ],
      };

      mockTransactionManager.save.mockResolvedValue({
        ...mockBundle,
        ...createDto,
      });

      const result = await service.create(createDto as any, mockUserId, {});

      expect(bundleRepository.create).toHaveBeenCalled();
      expect(bundleComponentRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should save image when provided", async () => {
      const createDto = {
        name: { en: "New Bundle", ar: "حزمة جديدة" },
        categoryId: mockCategoryId,
        price: 99.99,
      };
      const files = { image: [{ originalname: "test.jpg" }] };
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: "uploaded-image.jpg",
      } as any);
      mockTransactionManager.save.mockResolvedValue(mockBundle);

      await service.create(createDto as any, mockUserId, files as any);

      expect(uploadMediaService.saveOneFile).toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return paginated bundles", async () => {
      const filterDto = { page: 1, limit: 10 };
      bundleRepository.query
        .mockResolvedValueOnce([mockBundle])
        .mockResolvedValueOnce([{ total: "1" }]);

      const result = await service.findAll(filterDto);

      expect(result.bundles).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should filter by search term", async () => {
      const filterDto = { page: 1, limit: 10, search: "test" };
      bundleRepository.query
        .mockResolvedValueOnce([mockBundle])
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.findAll(filterDto);

      expect(bundleRepository.query).toHaveBeenCalled();
    });

    it("should filter by status", async () => {
      const filterDto = { page: 1, limit: 10, status: BundleStatus.ACTIVE };
      bundleRepository.query
        .mockResolvedValueOnce([mockBundle])
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.findAll(filterDto);

      expect(bundleRepository.query).toHaveBeenCalled();
    });

    it("should filter by price range", async () => {
      const filterDto = { page: 1, limit: 10, minPrice: 50, maxPrice: 100 };
      bundleRepository.query
        .mockResolvedValueOnce([mockBundle])
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.findAll(filterDto);

      expect(bundleRepository.query).toHaveBeenCalled();
    });

    it("should filter by date range", async () => {
      const filterDto = {
        page: 1,
        limit: 10,
        fromDate: new Date("2024-01-01"),
        toDate: new Date("2024-12-31"),
      };
      bundleRepository.query
        .mockResolvedValueOnce([mockBundle])
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.findAll(filterDto as any);

      expect(bundleRepository.query).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a bundle by id", async () => {
      bundleRepository.findOne.mockResolvedValue(mockBundle);

      const result = await service.findOne(mockBundleId);

      expect(bundleRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockBundle);
    });

    it("should throw NotFoundException when bundle not found", async () => {
      bundleRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockBundleId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a bundle", async () => {
      const updateDto = {
        name: { en: "Updated Bundle", ar: "حزمة محدثة" },
        price: 149.99,
      };
      bundleRepository.findOne.mockResolvedValue({ ...mockBundle });
      mockTransactionManager.save.mockResolvedValue({
        ...mockBundle,
        ...updateDto,
      });

      const result = await service.update(
        mockBundleId,
        updateDto as any,
        mockUserId,
        {},
      );

      expect(result).toBeDefined();
    });

    it("should update bundle components", async () => {
      const updateDto = {
        components: [
          {
            categoryId: "cat-123",
            quantity: 2,
            items: [{ itemId: "item-456", extraCost: 5 }],
          },
        ],
      };
      bundleRepository.findOne.mockResolvedValue({
        ...mockBundle,
        components: [{ id: "old-component" }],
      });
      mockTransactionManager.save.mockResolvedValue(mockBundle);

      await service.update(mockBundleId, updateDto as any, mockUserId, {});

      expect(mockTransactionManager.remove).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("should soft delete a bundle", async () => {
      bundleRepository.findOne.mockResolvedValue(mockBundle);
      bundleRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(mockBundleId);

      expect(bundleRepository.softDelete).toHaveBeenCalledWith(mockBundleId);
    });
  });

  describe("findByCategory", () => {
    it("should return bundles by category", async () => {
      bundleRepository.find.mockResolvedValue([mockBundle]);

      const result = await service.findByCategory(mockCategoryId);

      expect(bundleRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe("duplicate", () => {
    it("should duplicate a bundle", async () => {
      bundleRepository.findOne.mockResolvedValue(mockBundle);
      bundleRepository.save.mockResolvedValue({
        ...mockBundle,
        id: "new-bundle-123",
        name: { en: "Test Bundle - Copy", ar: "حزمة اختبار - نسخة" },
      });

      const result = await service.duplicate(mockBundleId, mockUserId);

      expect(bundleRepository.create).toHaveBeenCalled();
      expect(bundleRepository.save).toHaveBeenCalled();
      expect(result.name.en).toContain("Copy");
    });

    it("should duplicate bundle with components", async () => {
      const bundleWithComponents = {
        ...mockBundle,
        components: [
          {
            categoryId: "cat-123",
            quantity: 1,
            items: [{ itemId: "item-123", extraCost: 0 }],
          },
        ],
      };
      bundleRepository.findOne.mockResolvedValue(bundleWithComponents);
      bundleRepository.save.mockResolvedValue(bundleWithComponents);

      await service.duplicate(mockBundleId, mockUserId);

      expect(bundleComponentRepository.create).toHaveBeenCalled();
    });
  });

  describe("archiveBundle", () => {
    it("should archive a bundle", async () => {
      bundleRepository.findOne.mockResolvedValue({ ...mockBundle });
      bundleRepository.save.mockResolvedValue({
        ...mockBundle,
        status: BundleStatus.ARCHIVED,
      });

      const result = await service.archiveBundle(mockBundleId, mockUserId);

      expect(result.status).toBe(BundleStatus.ARCHIVED);
    });
  });
});
