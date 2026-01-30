import { Test, type TestingModule } from "@nestjs/testing";
import { CategoriesAdminController } from "./categories-admin.controller";
import { CategoriesService } from "./categories.service";

describe("CategoriesAdminController", () => {
  let controller: CategoriesAdminController;
  let categoriesService: jest.Mocked<CategoriesService>;

  const mockUserId = "admin-123";
  const mockCategoryId = "category-123";

  const mockCategory = {
    id: mockCategoryId,
    name: { en: "Burgers", ar: "برجر" },
    sortOrder: 1,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesAdminController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            reorderCategories: jest.fn(),
            findActiveCategories: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CategoriesAdminController>(
      CategoriesAdminController,
    );
    categoriesService = module.get(CategoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated categories", async () => {
      const paginatedResult = {
        categories: [mockCategory],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      categoriesService.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(categoriesService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        "ASC",
      );
      expect(result.message).toBe("Categories retrieved successfully");
    });

    it("should filter by search and isActive", async () => {
      categoriesService.findAll.mockResolvedValue({
        categories: [],
        total: 0,
      } as any);

      await controller.findAll({
        page: 1,
        limit: 10,
        search: "burger",
        isActive: "true",
      });

      expect(categoriesService.findAll).toHaveBeenCalledWith(
        1,
        10,
        "burger",
        "true",
        undefined,
        "ASC",
      );
    });
  });

  describe("create", () => {
    it("should create a category", async () => {
      const createDto = { name: { en: "New Category" } } as any;
      categoriesService.create.mockResolvedValue(mockCategory as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.create({}, createDto, mockReq);

      expect(categoriesService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
        {},
      );
      expect(result.message).toBe("Category created successfully");
    });

    it("should create a category with image file", async () => {
      const createDto = { name: { en: "New Category" } } as any;
      const mockFiles = { image: [{ originalname: "test.jpg" }] } as any;
      categoriesService.create.mockResolvedValue(mockCategory as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.create(mockFiles, createDto, mockReq);

      expect(categoriesService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
        mockFiles,
      );
      expect(result.message).toBe("Category created successfully");
    });
  });

  describe("reorder", () => {
    it("should reorder categories", async () => {
      const reorderDto = {
        categoryIds: ["cat-1", "cat-2", "cat-3"],
      } as any;
      const reorderedCategories = [mockCategory];
      categoriesService.reorderCategories.mockResolvedValue(
        reorderedCategories as any,
      );

      const result = await controller.reorder(reorderDto);

      expect(categoriesService.reorderCategories).toHaveBeenCalledWith(
        reorderDto,
      );
      expect(result.message).toBe("Categories reordered successfully");
    });
  });

  describe("findActiveCategories", () => {
    it("should return active categories", async () => {
      categoriesService.findActiveCategories.mockResolvedValue([
        mockCategory,
      ] as any);

      const result = await controller.findActiveCategories();

      expect(categoriesService.findActiveCategories).toHaveBeenCalled();
      expect(result.message).toBe("Active categories retrieved successfully");
    });
  });

  describe("findOne", () => {
    it("should return category by id", async () => {
      categoriesService.findOne.mockResolvedValue(mockCategory as any);

      const result = await controller.findOne(mockCategoryId);

      expect(categoriesService.findOne).toHaveBeenCalledWith(mockCategoryId);
      expect(result.message).toBe("Category retrieved successfully");
    });
  });

  describe("update", () => {
    it("should update a category", async () => {
      const updateDto = { name: { en: "Updated Category" } } as any;
      const updatedCategory = { ...mockCategory, name: { en: "Updated Category" } };
      categoriesService.update.mockResolvedValue(updatedCategory as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.update(mockCategoryId, {}, updateDto, mockReq);

      expect(categoriesService.update).toHaveBeenCalledWith(
        mockCategoryId,
        updateDto,
        mockUserId,
        {},
      );
      expect(result.message).toBe("Category updated successfully");
    });

    it("should update a category with image file", async () => {
      const updateDto = { name: { en: "Updated Category" } } as any;
      const mockFiles = { image: [{ originalname: "test.jpg" }] } as any;
      const updatedCategory = { ...mockCategory, name: { en: "Updated Category" } };
      categoriesService.update.mockResolvedValue(updatedCategory as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.update(mockCategoryId, mockFiles, updateDto, mockReq);

      expect(categoriesService.update).toHaveBeenCalledWith(
        mockCategoryId,
        updateDto,
        mockUserId,
        mockFiles,
      );
      expect(result.message).toBe("Category updated successfully");
    });
  });

  describe("remove", () => {
    it("should delete a category", async () => {
      categoriesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockCategoryId);

      expect(categoriesService.remove).toHaveBeenCalledWith(mockCategoryId);
      expect(result.message).toBe("Category deleted successfully");
    });
  });
});
