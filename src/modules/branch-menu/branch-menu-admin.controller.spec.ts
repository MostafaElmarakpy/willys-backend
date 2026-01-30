import { Test, type TestingModule } from "@nestjs/testing";
import { BranchMenuService } from "./branch-menu.service";
import { BranchMenuAdminController } from "./branch-menu-admin.controller";

describe("BranchMenuAdminController", () => {
  let controller: BranchMenuAdminController;
  let branchMenuService: jest.Mocked<BranchMenuService>;

  const mockUserId = "admin-123";
  const mockBranchId = "branch-123";
  const mockCategoryId = "category-123";
  const mockItemId = "item-123";
  const mockBundleId = "bundle-123";

  const mockOverride = {
    id: "override-123",
    branchId: mockBranchId,
    isAvailable: true,
    reason: "In stock",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchMenuAdminController],
      providers: [
        {
          provide: BranchMenuService,
          useValue: {
            getBranchCategoryOverrides: jest.fn(),
            getBranchItemOverrides: jest.fn(),
            getBranchBundleOverrides: jest.fn(),
            setBranchCategoryAvailability: jest.fn(),
            setBranchItemAvailability: jest.fn(),
            setBranchBundleAvailability: jest.fn(),
            bulkUpdateAvailability: jest.fn(),
            removeCategoryOverride: jest.fn(),
            removeItemOverride: jest.fn(),
            removeBundleOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BranchMenuAdminController>(
      BranchMenuAdminController,
    );
    branchMenuService = module.get(BranchMenuService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getBranchOverrides", () => {
    it("should return all branch overrides", async () => {
      const categoryOverrides = [{ categoryId: mockCategoryId }];
      const itemOverrides = [{ itemId: mockItemId }];
      const bundleOverrides = [{ bundleId: mockBundleId }];

      branchMenuService.getBranchCategoryOverrides.mockResolvedValue(
        categoryOverrides as any,
      );
      branchMenuService.getBranchItemOverrides.mockResolvedValue(
        itemOverrides as any,
      );
      branchMenuService.getBranchBundleOverrides.mockResolvedValue(
        bundleOverrides as any,
      );

      const result = await controller.getBranchOverrides(mockBranchId);

      expect(branchMenuService.getBranchCategoryOverrides).toHaveBeenCalledWith(
        mockBranchId,
      );
      expect(branchMenuService.getBranchItemOverrides).toHaveBeenCalledWith(
        mockBranchId,
      );
      expect(branchMenuService.getBranchBundleOverrides).toHaveBeenCalledWith(
        mockBranchId,
      );
      expect(result.message).toBe(
        "Branch menu overrides retrieved successfully",
      );
      expect(result.data.categories).toEqual(categoryOverrides);
      expect(result.data.items).toEqual(itemOverrides);
      expect(result.data.bundles).toEqual(bundleOverrides);
    });
  });

  describe("setCategoryAvailability", () => {
    it("should set category availability", async () => {
      const dto = { isAvailable: true, reason: "In stock" };
      branchMenuService.setBranchCategoryAvailability.mockResolvedValue(
        mockOverride as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.setCategoryAvailability(
        mockBranchId,
        mockCategoryId,
        dto,
        mockReq,
      );

      expect(
        branchMenuService.setBranchCategoryAvailability,
      ).toHaveBeenCalledWith(
        mockBranchId,
        mockCategoryId,
        true,
        mockUserId,
        "In stock",
      );
      expect(result.message).toBe("Category availability updated successfully");
    });
  });

  describe("setItemAvailability", () => {
    it("should set item availability", async () => {
      const dto = { isAvailable: false, reason: "Out of stock" };
      branchMenuService.setBranchItemAvailability.mockResolvedValue(
        mockOverride as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.setItemAvailability(
        mockBranchId,
        mockItemId,
        dto,
        mockReq,
      );

      expect(branchMenuService.setBranchItemAvailability).toHaveBeenCalledWith(
        mockBranchId,
        mockItemId,
        false,
        mockUserId,
        "Out of stock",
      );
      expect(result.message).toBe("Item availability updated successfully");
    });
  });

  describe("setBundleAvailability", () => {
    it("should set bundle availability", async () => {
      const dto = { isAvailable: true };
      branchMenuService.setBranchBundleAvailability.mockResolvedValue(
        mockOverride as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.setBundleAvailability(
        mockBranchId,
        mockBundleId,
        dto,
        mockReq,
      );

      expect(
        branchMenuService.setBranchBundleAvailability,
      ).toHaveBeenCalledWith(
        mockBranchId,
        mockBundleId,
        true,
        mockUserId,
        undefined,
      );
      expect(result.message).toBe("Bundle availability updated successfully");
    });
  });

  describe("bulkUpdateAvailability", () => {
    it("should bulk update availability", async () => {
      const dto = {
        categories: [{ categoryId: mockCategoryId, isAvailable: true }],
        items: [{ itemId: mockItemId, isAvailable: false }],
        bundles: [{ bundleId: mockBundleId, isAvailable: true }],
      } as any;
      const bulkResult = {
        categoriesUpdated: 1,
        itemsUpdated: 1,
        bundlesUpdated: 1,
      };
      branchMenuService.bulkUpdateAvailability.mockResolvedValue(
        bulkResult as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.bulkUpdateAvailability(
        mockBranchId,
        dto,
        mockReq,
      );

      expect(branchMenuService.bulkUpdateAvailability).toHaveBeenCalledWith(
        mockBranchId,
        dto,
        mockUserId,
      );
      expect(result.message).toBe(
        "Bulk availability update completed successfully",
      );
    });
  });

  describe("removeCategoryOverride", () => {
    it("should remove category override", async () => {
      branchMenuService.removeCategoryOverride.mockResolvedValue(undefined);

      const result = await controller.removeCategoryOverride(
        mockBranchId,
        mockCategoryId,
      );

      expect(branchMenuService.removeCategoryOverride).toHaveBeenCalledWith(
        mockBranchId,
        mockCategoryId,
      );
      expect(result.message).toBe("Category override removed successfully");
    });
  });

  describe("removeItemOverride", () => {
    it("should remove item override", async () => {
      branchMenuService.removeItemOverride.mockResolvedValue(undefined);

      const result = await controller.removeItemOverride(
        mockBranchId,
        mockItemId,
      );

      expect(branchMenuService.removeItemOverride).toHaveBeenCalledWith(
        mockBranchId,
        mockItemId,
      );
      expect(result.message).toBe("Item override removed successfully");
    });
  });

  describe("removeBundleOverride", () => {
    it("should remove bundle override", async () => {
      branchMenuService.removeBundleOverride.mockResolvedValue(undefined);

      const result = await controller.removeBundleOverride(
        mockBranchId,
        mockBundleId,
      );

      expect(branchMenuService.removeBundleOverride).toHaveBeenCalledWith(
        mockBranchId,
        mockBundleId,
      );
      expect(result.message).toBe("Bundle override removed successfully");
    });
  });
});
