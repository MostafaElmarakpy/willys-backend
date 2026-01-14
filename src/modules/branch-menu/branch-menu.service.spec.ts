import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { BundleStatus } from "src/common/enums/BundleStatus";
import { ItemStatus } from "src/common/enums/ItemStatus";
import { Branch } from "src/database/entities/branch.entity";
import { BranchBundleOverride } from "src/database/entities/branch-bundle-override.entity";
import { BranchCategoryOverride } from "src/database/entities/branch-category-override.entity";
import { BranchItemOverride } from "src/database/entities/branch-item-override.entity";
import { Bundle } from "src/database/entities/bundle.entity";
import { Category } from "src/database/entities/category.entity";
import { Item } from "src/database/entities/item.entity";
import { Repository } from "typeorm";
import { BranchMenuService } from "./branch-menu.service";

describe("BranchMenuService", () => {
  let service: BranchMenuService;
  let branchRepo: jest.Mocked<Repository<Branch>>;
  let categoryRepo: jest.Mocked<Repository<Category>>;
  let itemRepo: jest.Mocked<Repository<Item>>;
  let bundleRepo: jest.Mocked<Repository<Bundle>>;
  let categoryOverrideRepo: jest.Mocked<Repository<BranchCategoryOverride>>;
  let itemOverrideRepo: jest.Mocked<Repository<BranchItemOverride>>;
  let bundleOverrideRepo: jest.Mocked<Repository<BranchBundleOverride>>;

  const mockBranchId = "branch-123";
  const mockCategoryId = "category-123";
  const mockItemId = "item-123";
  const mockBundleId = "bundle-123";
  const mockUserId = "user-123";

  const mockBranch: Partial<Branch> = {
    id: mockBranchId,
    name: { en: "Main Branch", ar: "الفرع الرئيسي" },
    isActive: true,
    isOpen: true,
  };

  const mockCategory: Partial<Category> = {
    id: mockCategoryId,
    name: { en: "Burgers", ar: "برجر" },
    isActive: true,
  };

  const mockItem: Partial<Item> = {
    id: mockItemId,
    name: { en: "Cheese Burger", ar: "تشيز برجر" },
    status: ItemStatus.ACTIVE,
    categoryId: mockCategoryId,
    category: mockCategory as Category,
  };

  const mockBundle: Partial<Bundle> = {
    id: mockBundleId,
    name: { en: "Family Meal", ar: "وجبة عائلية" },
    status: BundleStatus.ACTIVE,
    categoryId: mockCategoryId,
    category: mockCategory as Category,
  };

  const mockCategoryOverride: Partial<BranchCategoryOverride> = {
    id: "override-1",
    branchId: mockBranchId,
    categoryId: mockCategoryId,
    isAvailable: true,
    createdById: mockUserId,
  };

  const mockItemOverride: Partial<BranchItemOverride> = {
    id: "override-2",
    branchId: mockBranchId,
    itemId: mockItemId,
    isAvailable: true,
    createdById: mockUserId,
  };

  const mockBundleOverride: Partial<BranchBundleOverride> = {
    id: "override-3",
    branchId: mockBranchId,
    bundleId: mockBundleId,
    isAvailable: true,
    createdById: mockUserId,
  };

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchMenuService,
        {
          provide: getRepositoryToken(Branch),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Category),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Item),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Bundle),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(BranchCategoryOverride),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
            manager: {
              transaction: jest.fn().mockImplementation((cb) => cb({})),
            },
          },
        },
        {
          provide: getRepositoryToken(BranchItemOverride),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BranchBundleOverride),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BranchMenuService>(BranchMenuService);
    branchRepo = module.get(getRepositoryToken(Branch));
    categoryRepo = module.get(getRepositoryToken(Category));
    itemRepo = module.get(getRepositoryToken(Item));
    bundleRepo = module.get(getRepositoryToken(Bundle));
    categoryOverrideRepo = module.get(
      getRepositoryToken(BranchCategoryOverride),
    );
    itemOverrideRepo = module.get(getRepositoryToken(BranchItemOverride));
    bundleOverrideRepo = module.get(getRepositoryToken(BranchBundleOverride));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("setBranchCategoryAvailability", () => {
    it("should create a new category override", async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      categoryRepo.findOne.mockResolvedValue(mockCategory as Category);
      categoryOverrideRepo.findOne.mockResolvedValue(null);
      categoryOverrideRepo.create.mockReturnValue(
        mockCategoryOverride as BranchCategoryOverride,
      );
      categoryOverrideRepo.save.mockResolvedValue(
        mockCategoryOverride as BranchCategoryOverride,
      );

      const result = await service.setBranchCategoryAvailability(
        mockBranchId,
        mockCategoryId,
        true,
        mockUserId,
        "Test reason",
      );

      expect(result).toBeDefined();
      expect(categoryOverrideRepo.create).toHaveBeenCalledWith({
        branchId: mockBranchId,
        categoryId: mockCategoryId,
        isAvailable: true,
        reason: "Test reason",
        createdById: mockUserId,
      });
    });

    it("should update existing category override", async () => {
      const existingOverride = { ...mockCategoryOverride, isAvailable: true };
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      categoryRepo.findOne.mockResolvedValue(mockCategory as Category);
      categoryOverrideRepo.findOne.mockResolvedValue(
        existingOverride as BranchCategoryOverride,
      );
      categoryOverrideRepo.save.mockResolvedValue({
        ...existingOverride,
        isAvailable: false,
      } as BranchCategoryOverride);

      await service.setBranchCategoryAvailability(
        mockBranchId,
        mockCategoryId,
        false,
        mockUserId,
      );

      expect(categoryOverrideRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isAvailable: false,
          updatedById: mockUserId,
        }),
      );
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setBranchCategoryAvailability(
          mockBranchId,
          mockCategoryId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if category not found", async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setBranchCategoryAvailability(
          mockBranchId,
          mockCategoryId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if enabling inactive category", async () => {
      const inactiveCategory = { ...mockCategory, isActive: false };
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      categoryRepo.findOne.mockResolvedValue(inactiveCategory as Category);

      await expect(
        service.setBranchCategoryAvailability(
          mockBranchId,
          mockCategoryId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow disabling inactive category", async () => {
      const inactiveCategory = { ...mockCategory, isActive: false };
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      categoryRepo.findOne.mockResolvedValue(inactiveCategory as Category);
      categoryOverrideRepo.findOne.mockResolvedValue(null);
      categoryOverrideRepo.create.mockReturnValue({
        ...mockCategoryOverride,
        isAvailable: false,
      } as BranchCategoryOverride);
      categoryOverrideRepo.save.mockResolvedValue({
        ...mockCategoryOverride,
        isAvailable: false,
      } as BranchCategoryOverride);

      const result = await service.setBranchCategoryAvailability(
        mockBranchId,
        mockCategoryId,
        false,
        mockUserId,
      );

      expect(result.isAvailable).toBe(false);
    });
  });

  describe("setBranchItemAvailability", () => {
    it("should create a new item override", async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepo.findOne.mockResolvedValue(mockItem as Item);
      itemOverrideRepo.findOne.mockResolvedValue(null);
      itemOverrideRepo.create.mockReturnValue(
        mockItemOverride as BranchItemOverride,
      );
      itemOverrideRepo.save.mockResolvedValue(
        mockItemOverride as BranchItemOverride,
      );

      const result = await service.setBranchItemAvailability(
        mockBranchId,
        mockItemId,
        true,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(itemOverrideRepo.create).toHaveBeenCalledWith({
        branchId: mockBranchId,
        itemId: mockItemId,
        isAvailable: true,
        reason: undefined,
        createdById: mockUserId,
      });
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setBranchItemAvailability(
          mockBranchId,
          mockItemId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if item not found", async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setBranchItemAvailability(
          mockBranchId,
          mockItemId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if enabling inactive item", async () => {
      const inactiveItem = { ...mockItem, status: ItemStatus.DRAFT };
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepo.findOne.mockResolvedValue(inactiveItem as Item);

      await expect(
        service.setBranchItemAvailability(
          mockBranchId,
          mockItemId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if parent category is inactive", async () => {
      const itemWithInactiveCategory = {
        ...mockItem,
        category: { ...mockCategory, isActive: false },
      };
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepo.findOne.mockResolvedValue(itemWithInactiveCategory as Item);

      await expect(
        service.setBranchItemAvailability(
          mockBranchId,
          mockItemId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("setBranchBundleAvailability", () => {
    it("should create a new bundle override", async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      bundleRepo.findOne.mockResolvedValue(mockBundle as Bundle);
      bundleOverrideRepo.findOne.mockResolvedValue(null);
      bundleOverrideRepo.create.mockReturnValue(
        mockBundleOverride as BranchBundleOverride,
      );
      bundleOverrideRepo.save.mockResolvedValue(
        mockBundleOverride as BranchBundleOverride,
      );

      const result = await service.setBranchBundleAvailability(
        mockBranchId,
        mockBundleId,
        true,
        mockUserId,
      );

      expect(result).toBeDefined();
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setBranchBundleAvailability(
          mockBranchId,
          mockBundleId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if bundle not found", async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      bundleRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setBranchBundleAvailability(
          mockBranchId,
          mockBundleId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if enabling inactive bundle", async () => {
      const inactiveBundle = { ...mockBundle, status: BundleStatus.DRAFT };
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      bundleRepo.findOne.mockResolvedValue(inactiveBundle as Bundle);

      await expect(
        service.setBranchBundleAvailability(
          mockBranchId,
          mockBundleId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if parent category is inactive", async () => {
      const bundleWithInactiveCategory = {
        ...mockBundle,
        category: { ...mockCategory, isActive: false },
      };
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      bundleRepo.findOne.mockResolvedValue(
        bundleWithInactiveCategory as Bundle,
      );

      await expect(
        service.setBranchBundleAvailability(
          mockBranchId,
          mockBundleId,
          true,
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getAvailableMenuForBranch", () => {
    it("should return available menu for branch", async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };

      mockQueryBuilder.getMany
        .mockResolvedValueOnce([mockCategory]) // categories
        .mockResolvedValueOnce([mockItem]) // items
        .mockResolvedValueOnce([mockBundle]); // bundles

      categoryRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      itemRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      bundleRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getAvailableMenuForBranch(mockBranchId);

      expect(result.categories).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.bundles).toBeDefined();
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getAvailableMenuForBranch(mockBranchId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getBranchCategoryOverrides", () => {
    it("should return category overrides for branch", async () => {
      categoryOverrideRepo.find.mockResolvedValue([
        mockCategoryOverride as BranchCategoryOverride,
      ]);

      const result = await service.getBranchCategoryOverrides(mockBranchId);

      expect(result).toHaveLength(1);
      expect(categoryOverrideRepo.find).toHaveBeenCalledWith({
        where: { branchId: mockBranchId, deletedAt: expect.anything() },
        relations: ["category", "createdBy", "updatedBy"],
      });
    });
  });

  describe("getBranchItemOverrides", () => {
    it("should return item overrides for branch", async () => {
      itemOverrideRepo.find.mockResolvedValue([
        mockItemOverride as BranchItemOverride,
      ]);

      const result = await service.getBranchItemOverrides(mockBranchId);

      expect(result).toHaveLength(1);
    });
  });

  describe("getBranchBundleOverrides", () => {
    it("should return bundle overrides for branch", async () => {
      bundleOverrideRepo.find.mockResolvedValue([
        mockBundleOverride as BranchBundleOverride,
      ]);

      const result = await service.getBranchBundleOverrides(mockBranchId);

      expect(result).toHaveLength(1);
    });
  });

  describe("removeCategoryOverride", () => {
    it("should soft remove existing override", async () => {
      categoryOverrideRepo.findOne.mockResolvedValue(
        mockCategoryOverride as BranchCategoryOverride,
      );
      categoryOverrideRepo.softRemove.mockResolvedValue(
        mockCategoryOverride as BranchCategoryOverride,
      );

      await service.removeCategoryOverride(mockBranchId, mockCategoryId);

      expect(categoryOverrideRepo.softRemove).toHaveBeenCalledWith(
        mockCategoryOverride,
      );
    });

    it("should do nothing if override not found", async () => {
      categoryOverrideRepo.findOne.mockResolvedValue(null);

      await service.removeCategoryOverride(mockBranchId, mockCategoryId);

      expect(categoryOverrideRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  describe("removeItemOverride", () => {
    it("should soft remove existing override", async () => {
      itemOverrideRepo.findOne.mockResolvedValue(
        mockItemOverride as BranchItemOverride,
      );
      itemOverrideRepo.softRemove.mockResolvedValue(
        mockItemOverride as BranchItemOverride,
      );

      await service.removeItemOverride(mockBranchId, mockItemId);

      expect(itemOverrideRepo.softRemove).toHaveBeenCalledWith(
        mockItemOverride,
      );
    });
  });

  describe("removeBundleOverride", () => {
    it("should soft remove existing override", async () => {
      bundleOverrideRepo.findOne.mockResolvedValue(
        mockBundleOverride as BranchBundleOverride,
      );
      bundleOverrideRepo.softRemove.mockResolvedValue(
        mockBundleOverride as BranchBundleOverride,
      );

      await service.removeBundleOverride(mockBranchId, mockBundleId);

      expect(bundleOverrideRepo.softRemove).toHaveBeenCalledWith(
        mockBundleOverride,
      );
    });
  });

  describe("isItemAvailable", () => {
    it("should return true for active item with no overrides", async () => {
      itemRepo.findOne.mockResolvedValue(mockItem as Item);
      categoryOverrideRepo.findOne.mockResolvedValue(null);
      itemOverrideRepo.findOne.mockResolvedValue(null);

      const result = await service.isItemAvailable(mockBranchId, mockItemId);

      expect(result).toBe(true);
    });

    it("should return false if item not found", async () => {
      itemRepo.findOne.mockResolvedValue(null);

      const result = await service.isItemAvailable(mockBranchId, mockItemId);

      expect(result).toBe(false);
    });

    it("should return false if item is not active", async () => {
      const inactiveItem = { ...mockItem, status: ItemStatus.DRAFT };
      itemRepo.findOne.mockResolvedValue(inactiveItem as Item);

      const result = await service.isItemAvailable(mockBranchId, mockItemId);

      expect(result).toBe(false);
    });

    it("should return false if parent category is inactive", async () => {
      const itemWithInactiveCategory = {
        ...mockItem,
        category: { ...mockCategory, isActive: false },
      };
      itemRepo.findOne.mockResolvedValue(itemWithInactiveCategory as Item);

      const result = await service.isItemAvailable(mockBranchId, mockItemId);

      expect(result).toBe(false);
    });

    it("should return false if category override disables category", async () => {
      itemRepo.findOne.mockResolvedValue(mockItem as Item);
      categoryOverrideRepo.findOne.mockResolvedValue({
        ...mockCategoryOverride,
        isAvailable: false,
      } as BranchCategoryOverride);

      const result = await service.isItemAvailable(mockBranchId, mockItemId);

      expect(result).toBe(false);
    });

    it("should return false if item override disables item", async () => {
      itemRepo.findOne.mockResolvedValue(mockItem as Item);
      categoryOverrideRepo.findOne.mockResolvedValue(null);
      itemOverrideRepo.findOne.mockResolvedValue({
        ...mockItemOverride,
        isAvailable: false,
      } as BranchItemOverride);

      const result = await service.isItemAvailable(mockBranchId, mockItemId);

      expect(result).toBe(false);
    });
  });

  describe("isBundleAvailable", () => {
    it("should return true for active bundle with no overrides", async () => {
      bundleRepo.findOne.mockResolvedValue(mockBundle as Bundle);
      categoryOverrideRepo.findOne.mockResolvedValue(null);
      bundleOverrideRepo.findOne.mockResolvedValue(null);

      const result = await service.isBundleAvailable(
        mockBranchId,
        mockBundleId,
      );

      expect(result).toBe(true);
    });

    it("should return false if bundle not found", async () => {
      bundleRepo.findOne.mockResolvedValue(null);

      const result = await service.isBundleAvailable(
        mockBranchId,
        mockBundleId,
      );

      expect(result).toBe(false);
    });

    it("should return false if bundle is not active", async () => {
      const inactiveBundle = { ...mockBundle, status: BundleStatus.DRAFT };
      bundleRepo.findOne.mockResolvedValue(inactiveBundle as Bundle);

      const result = await service.isBundleAvailable(
        mockBranchId,
        mockBundleId,
      );

      expect(result).toBe(false);
    });

    it("should return false if category override disables category", async () => {
      bundleRepo.findOne.mockResolvedValue(mockBundle as Bundle);
      categoryOverrideRepo.findOne.mockResolvedValue({
        ...mockCategoryOverride,
        isAvailable: false,
      } as BranchCategoryOverride);

      const result = await service.isBundleAvailable(
        mockBranchId,
        mockBundleId,
      );

      expect(result).toBe(false);
    });

    it("should return false if bundle override disables bundle", async () => {
      bundleRepo.findOne.mockResolvedValue(mockBundle as Bundle);
      categoryOverrideRepo.findOne.mockResolvedValue(null);
      bundleOverrideRepo.findOne.mockResolvedValue({
        ...mockBundleOverride,
        isAvailable: false,
      } as BranchBundleOverride);

      const result = await service.isBundleAvailable(
        mockBranchId,
        mockBundleId,
      );

      expect(result).toBe(false);
    });
  });

  describe("bulkUpdateAvailability", () => {
    it("should process bulk updates successfully", async () => {
      branchRepo.findOne.mockResolvedValue(mockBranch as Branch);
      categoryRepo.findOne.mockResolvedValue(mockCategory as Category);
      itemRepo.findOne.mockResolvedValue(mockItem as Item);
      bundleRepo.findOne.mockResolvedValue(mockBundle as Bundle);

      categoryOverrideRepo.findOne.mockResolvedValue(null);
      itemOverrideRepo.findOne.mockResolvedValue(null);
      bundleOverrideRepo.findOne.mockResolvedValue(null);

      categoryOverrideRepo.create.mockReturnValue(
        mockCategoryOverride as BranchCategoryOverride,
      );
      itemOverrideRepo.create.mockReturnValue(
        mockItemOverride as BranchItemOverride,
      );
      bundleOverrideRepo.create.mockReturnValue(
        mockBundleOverride as BranchBundleOverride,
      );

      categoryOverrideRepo.save.mockResolvedValue(
        mockCategoryOverride as BranchCategoryOverride,
      );
      itemOverrideRepo.save.mockResolvedValue(
        mockItemOverride as BranchItemOverride,
      );
      bundleOverrideRepo.save.mockResolvedValue(
        mockBundleOverride as BranchBundleOverride,
      );

      const updates = {
        categories: [{ categoryId: mockCategoryId, isAvailable: true }],
        items: [{ itemId: mockItemId, isAvailable: true }],
        bundles: [{ bundleId: mockBundleId, isAvailable: true }],
      };

      const result = await service.bulkUpdateAvailability(
        mockBranchId,
        updates,
        mockUserId,
      );

      expect(result.categories).toHaveLength(1);
      expect(result.items).toHaveLength(1);
      expect(result.bundles).toHaveLength(1);
    });

    it("should handle empty updates", async () => {
      const result = await service.bulkUpdateAvailability(
        mockBranchId,
        {},
        mockUserId,
      );

      expect(result.categories).toHaveLength(0);
      expect(result.items).toHaveLength(0);
      expect(result.bundles).toHaveLength(0);
    });
  });
});
