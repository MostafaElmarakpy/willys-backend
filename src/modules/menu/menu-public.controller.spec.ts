import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { BundlesService } from "./bundles.service";
import { CategoriesService } from "./categories.service";
import { ItemsService } from "./items.service";
import { MenuPublicController } from "./menu-public.controller";

describe("MenuPublicController", () => {
  let controller: MenuPublicController;
  let categoriesService: jest.Mocked<CategoriesService>;
  let itemsService: jest.Mocked<ItemsService>;
  let bundlesService: jest.Mocked<BundlesService>;

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
    status: "active",
  };

  const mockBundle = {
    id: mockBundleId,
    name: { en: "Family Meal", ar: "وجبة عائلية" },
    price: 150,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuPublicController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: ItemsService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: BundlesService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MenuPublicController>(MenuPublicController);
    categoriesService = module.get(CategoriesService);
    itemsService = module.get(ItemsService);
    bundlesService = module.get(BundlesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCategories", () => {
    it("should return all active categories", async () => {
      categoriesService.findAll.mockResolvedValue({
        categories: [mockCategory],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      } as any);

      const result = await controller.getCategories();

      expect(categoriesService.findAll).toHaveBeenCalledWith(
        1,
        100,
        undefined,
        "true",
      );
      expect(result.message).toBe("Categories retrieved successfully");
      expect(result.data).toHaveLength(1);
    });

    it("should return empty array when no categories", async () => {
      categoriesService.findAll.mockResolvedValue({
        categories: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      } as any);

      const result = await controller.getCategories();

      expect(result.data).toEqual([]);
    });
  });

  describe("searchItems", () => {
    it("should search items by query", async () => {
      itemsService.findAll.mockResolvedValue({
        items: [mockItem],
        total: 1,
      } as any);

      const result = await controller.searchItems("burger");

      expect(itemsService.findAll).toHaveBeenCalledWith({
        search: "burger",
        status: "active",
        page: 1,
        limit: 50,
      });
      expect(result.message).toBe("Items retrieved successfully");
      expect(result.data).toHaveLength(1);
    });

    it("should return empty array when no items match", async () => {
      itemsService.findAll.mockResolvedValue({
        items: [],
        total: 0,
      } as any);

      const result = await controller.searchItems("nonexistent");

      expect(result.data).toEqual([]);
    });
  });

  describe("getItemsByCategory", () => {
    it("should return items by category", async () => {
      itemsService.findAll.mockResolvedValue({
        items: [mockItem],
        total: 1,
      } as any);

      const result = await controller.getItemsByCategory(mockCategoryId);

      expect(itemsService.findAll).toHaveBeenCalledWith({
        categoriesIds: mockCategoryId,
        status: "active",
        page: 1,
        limit: 100,
      });
      expect(result.message).toBe("Items retrieved successfully");
    });

    it("should return empty array when category has no items", async () => {
      itemsService.findAll.mockResolvedValue({
        items: [],
        total: 0,
      } as any);

      const result = await controller.getItemsByCategory(mockCategoryId);

      expect(result.data).toEqual([]);
    });
  });

  describe("getItem", () => {
    it("should return item by id", async () => {
      itemsService.findOne.mockResolvedValue(mockItem as any);

      const result = await controller.getItem(mockItemId);

      expect(itemsService.findOne).toHaveBeenCalledWith(mockItemId);
      expect(result.message).toBe("Item retrieved successfully");
      expect(result.data).toEqual(mockItem);
    });

    it("should throw NotFoundException when item not found", async () => {
      itemsService.findOne.mockResolvedValue(null as any);

      await expect(controller.getItem("unknown-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getBundle", () => {
    it("should return bundle by id", async () => {
      bundlesService.findOne.mockResolvedValue(mockBundle as any);

      const result = await controller.getBundle(mockBundleId);

      expect(bundlesService.findOne).toHaveBeenCalledWith(mockBundleId);
      expect(result.message).toBe("Bundle retrieved successfully");
      expect(result.data).toEqual(mockBundle);
    });

    it("should throw NotFoundException when bundle not found", async () => {
      bundlesService.findOne.mockResolvedValue(null as any);

      await expect(controller.getBundle("unknown-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
