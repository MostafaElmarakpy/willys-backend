import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { BranchMenuController } from "./branch-menu.controller";
import { BranchMenuService } from "./branch-menu.service";

describe("BranchMenuController", () => {
  let controller: BranchMenuController;
  let branchMenuService: jest.Mocked<BranchMenuService>;

  const mockBranchId = "branch-123";
  const mockCategoryId = "category-123";
  const mockItemId = "item-123";
  const mockBundleId = "bundle-123";

  const mockCategory = {
    id: mockCategoryId,
    name: { en: "Burgers", ar: "برجر" },
    isActive: true,
  };

  const mockItem = {
    id: mockItemId,
    name: { en: "Cheese Burger", ar: "تشيز برجر" },
    price: 50,
    isAvailable: true,
  };

  const mockBundle = {
    id: mockBundleId,
    name: { en: "Family Meal", ar: "وجبة عائلية" },
    price: 150,
    isAvailable: true,
  };

  const mockMenu = {
    categories: [mockCategory],
    items: [mockItem],
    bundles: [mockBundle],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchMenuController],
      providers: [
        {
          provide: BranchMenuService,
          useValue: {
            getAvailableMenuForBranch: jest.fn(),
            getAvailableCategoriesForBranch: jest.fn(),
            getAvailableItemsForBranch: jest.fn(),
            getAvailableBundlesForBranch: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BranchMenuController>(BranchMenuController);
    branchMenuService = module.get(BranchMenuService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getBranchMenu", () => {
    it("should return full branch menu", async () => {
      branchMenuService.getAvailableMenuForBranch.mockResolvedValue(
        mockMenu as any,
      );

      const result = await controller.getBranchMenu(
        mockBranchId,
        true,
        true,
        true,
      );

      expect(branchMenuService.getAvailableMenuForBranch).toHaveBeenCalledWith(
        mockBranchId,
      );
      expect(result.message).toBe("Branch menu retrieved successfully");
      expect(result.data.categories).toBeDefined();
      expect(result.data.items).toBeDefined();
      expect(result.data.bundles).toBeDefined();
    });

    it("should return only categories when specified", async () => {
      branchMenuService.getAvailableMenuForBranch.mockResolvedValue(
        mockMenu as any,
      );

      const result = await controller.getBranchMenu(
        mockBranchId,
        true,
        false,
        false,
      );

      expect(result.data.categories).toBeDefined();
      expect(result.data.items).toBeUndefined();
      expect(result.data.bundles).toBeUndefined();
    });

    it("should return only items when specified", async () => {
      branchMenuService.getAvailableMenuForBranch.mockResolvedValue(
        mockMenu as any,
      );

      const result = await controller.getBranchMenu(
        mockBranchId,
        false,
        true,
        false,
      );

      expect(result.data.categories).toBeUndefined();
      expect(result.data.items).toBeDefined();
      expect(result.data.bundles).toBeUndefined();
    });
  });

  describe("getAvailableCategories", () => {
    it("should return available categories", async () => {
      branchMenuService.getAvailableCategoriesForBranch.mockResolvedValue([
        mockCategory,
      ] as any);

      const result = await controller.getAvailableCategories(mockBranchId);

      expect(
        branchMenuService.getAvailableCategoriesForBranch,
      ).toHaveBeenCalledWith(mockBranchId);
      expect(result.message).toBe(
        "Available categories retrieved successfully",
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe("getCategoryAtBranch", () => {
    it("should return category if available", async () => {
      branchMenuService.getAvailableCategoriesForBranch.mockResolvedValue([
        mockCategory,
      ] as any);

      const result = await controller.getCategoryAtBranch(
        mockBranchId,
        mockCategoryId,
      );

      expect(result.message).toBe("Category retrieved successfully");
      expect(result.data).toEqual(mockCategory);
    });

    it("should throw NotFoundException when category not found", async () => {
      branchMenuService.getAvailableCategoriesForBranch.mockResolvedValue([]);

      await expect(
        controller.getCategoryAtBranch(mockBranchId, "unknown-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAvailableItems", () => {
    it("should return available items", async () => {
      branchMenuService.getAvailableItemsForBranch.mockResolvedValue([
        mockItem,
      ] as any);

      const result = await controller.getAvailableItems(mockBranchId);

      expect(branchMenuService.getAvailableItemsForBranch).toHaveBeenCalledWith(
        mockBranchId,
      );
      expect(result.message).toBe("Available items retrieved successfully");
      expect(result.data).toHaveLength(1);
    });
  });

  describe("getItemAtBranch", () => {
    it("should return item if available", async () => {
      branchMenuService.getAvailableItemsForBranch.mockResolvedValue([
        mockItem,
      ] as any);

      const result = await controller.getItemAtBranch(mockBranchId, mockItemId);

      expect(result.message).toBe("Item retrieved successfully");
      expect(result.data).toEqual(mockItem);
    });

    it("should throw NotFoundException when item not found", async () => {
      branchMenuService.getAvailableItemsForBranch.mockResolvedValue([]);

      await expect(
        controller.getItemAtBranch(mockBranchId, "unknown-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAvailableBundles", () => {
    it("should return available bundles", async () => {
      branchMenuService.getAvailableBundlesForBranch.mockResolvedValue([
        mockBundle,
      ] as any);

      const result = await controller.getAvailableBundles(mockBranchId);

      expect(
        branchMenuService.getAvailableBundlesForBranch,
      ).toHaveBeenCalledWith(mockBranchId);
      expect(result.message).toBe("Available bundles retrieved successfully");
      expect(result.data).toHaveLength(1);
    });
  });

  describe("getBundleAtBranch", () => {
    it("should return bundle if available", async () => {
      branchMenuService.getAvailableBundlesForBranch.mockResolvedValue([
        mockBundle,
      ] as any);

      const result = await controller.getBundleAtBranch(
        mockBranchId,
        mockBundleId,
      );

      expect(result.message).toBe("Bundle retrieved successfully");
      expect(result.data).toEqual(mockBundle);
    });

    it("should throw NotFoundException when bundle not found", async () => {
      branchMenuService.getAvailableBundlesForBranch.mockResolvedValue([]);

      await expect(
        controller.getBundleAtBranch(mockBranchId, "unknown-id"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
