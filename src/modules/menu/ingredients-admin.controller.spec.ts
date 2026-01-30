import { Test, type TestingModule } from "@nestjs/testing";
import { IngredientsService } from "./ingredients.service";
import { IngredientsAdminController } from "./ingredients-admin.controller";

describe("IngredientsAdminController", () => {
  let controller: IngredientsAdminController;
  let ingredientsService: jest.Mocked<IngredientsService>;

  const mockUserId = "admin-123";
  const mockIngredientId = "ingredient-123";
  const mockCategoryId = "ing-category-123";

  const mockIngredientCategory = {
    id: mockCategoryId,
    name: { en: "Toppings", ar: "إضافات" },
    isActive: true,
  };

  const mockIngredient = {
    id: mockIngredientId,
    name: { en: "Cheese", ar: "جبن" },
    price: 5,
    isAvailable: true,
    categoryId: mockCategoryId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngredientsAdminController],
      providers: [
        {
          provide: IngredientsService,
          useValue: {
            findAllCategories: jest.fn(),
            createCategory: jest.fn(),
            findActiveCategories: jest.fn(),
            findOneCategory: jest.fn(),
            updateCategory: jest.fn(),
            removeCategory: jest.fn(),
            findAllIngredients: jest.fn(),
            createIngredient: jest.fn(),
            findDefaultExtras: jest.fn(),
            findOneIngredient: jest.fn(),
            updateIngredient: jest.fn(),
            removeIngredient: jest.fn(),
            findIngredientsByCategory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IngredientsAdminController>(
      IngredientsAdminController,
    );
    ingredientsService = module.get(IngredientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAllCategories", () => {
    it("should return paginated ingredient categories", async () => {
      const paginatedResult = {
        categories: [mockIngredientCategory],
        total: 1,
        page: 1,
        limit: 10,
      };
      ingredientsService.findAllCategories.mockResolvedValue(
        paginatedResult as any,
      );

      const result = await controller.findAllCategories({ page: 1, limit: 10 });

      expect(ingredientsService.findAllCategories).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        "DESC",
      );
      expect(result.message).toBe(
        "Ingredient categories retrieved successfully",
      );
    });
  });

  describe("createCategory", () => {
    it("should create an ingredient category", async () => {
      const createDto = { name: { en: "New Category" } } as any;
      ingredientsService.createCategory.mockResolvedValue(
        mockIngredientCategory as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.createCategory(createDto, mockReq);

      expect(ingredientsService.createCategory).toHaveBeenCalledWith(
        createDto,
        mockUserId,
      );
      expect(result.message).toBe("Ingredient category created successfully");
    });
  });

  describe("findActiveCategories", () => {
    it("should return active ingredient categories", async () => {
      ingredientsService.findActiveCategories.mockResolvedValue([
        mockIngredientCategory,
      ] as any);

      const result = await controller.findActiveCategories();

      expect(ingredientsService.findActiveCategories).toHaveBeenCalled();
      expect(result.message).toBe(
        "Active ingredient categories retrieved successfully",
      );
    });
  });

  describe("findOneCategory", () => {
    it("should return ingredient category by id", async () => {
      ingredientsService.findOneCategory.mockResolvedValue(
        mockIngredientCategory as any,
      );

      const result = await controller.findOneCategory(mockCategoryId);

      expect(ingredientsService.findOneCategory).toHaveBeenCalledWith(
        mockCategoryId,
      );
      expect(result.message).toBe("Ingredient category retrieved successfully");
    });
  });

  describe("updateCategory", () => {
    it("should update an ingredient category", async () => {
      const updateDto = { name: { en: "Updated Category" } } as any;
      ingredientsService.updateCategory.mockResolvedValue(
        mockIngredientCategory as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.updateCategory(
        mockCategoryId,
        updateDto,
        mockReq,
      );

      expect(ingredientsService.updateCategory).toHaveBeenCalledWith(
        mockCategoryId,
        updateDto,
        mockUserId,
      );
      expect(result.message).toBe("Ingredient category updated successfully");
    });
  });

  describe("removeCategory", () => {
    it("should delete an ingredient category", async () => {
      ingredientsService.removeCategory.mockResolvedValue(undefined);

      const result = await controller.removeCategory(mockCategoryId);

      expect(ingredientsService.removeCategory).toHaveBeenCalledWith(
        mockCategoryId,
      );
      expect(result.message).toBe("Ingredient category deleted successfully");
    });
  });

  describe("findAllIngredients", () => {
    it("should return paginated ingredients", async () => {
      const paginatedResult = {
        ingredients: [mockIngredient],
        total: 1,
        page: 1,
        limit: 10,
      };
      ingredientsService.findAllIngredients.mockResolvedValue(
        paginatedResult as any,
      );

      const result = await controller.findAllIngredients({
        page: 1,
        limit: 10,
      });

      expect(ingredientsService.findAllIngredients).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        undefined,
        undefined,
        "DESC",
      );
      expect(result.message).toBe("Ingredients retrieved successfully");
    });
  });

  describe("createIngredient", () => {
    it("should create an ingredient", async () => {
      const createDto = {
        name: { en: "New Ingredient" },
        price: 10,
      } as any;
      ingredientsService.createIngredient.mockResolvedValue(
        mockIngredient as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.createIngredient(createDto, mockReq);

      expect(ingredientsService.createIngredient).toHaveBeenCalledWith(
        createDto,
        mockUserId,
      );
      expect(result.message).toBe("Ingredient created successfully");
    });
  });

  describe("findDefaultExtras", () => {
    it("should return default extras", async () => {
      ingredientsService.findDefaultExtras.mockResolvedValue([
        mockIngredient,
      ] as any);

      const result = await controller.findDefaultExtras();

      expect(ingredientsService.findDefaultExtras).toHaveBeenCalled();
      expect(result.message).toBe("Default extras retrieved successfully");
    });
  });

  describe("findOneIngredient", () => {
    it("should return ingredient by id", async () => {
      ingredientsService.findOneIngredient.mockResolvedValue(
        mockIngredient as any,
      );

      const result = await controller.findOneIngredient(mockIngredientId);

      expect(ingredientsService.findOneIngredient).toHaveBeenCalledWith(
        mockIngredientId,
      );
      expect(result.message).toBe("Ingredient retrieved successfully");
    });
  });

  describe("updateIngredient", () => {
    it("should update an ingredient", async () => {
      const updateDto = { price: 7 } as any;
      ingredientsService.updateIngredient.mockResolvedValue(
        mockIngredient as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.updateIngredient(
        mockIngredientId,
        updateDto,
        mockReq,
      );

      expect(ingredientsService.updateIngredient).toHaveBeenCalledWith(
        mockIngredientId,
        updateDto,
        mockUserId,
      );
      expect(result.message).toBe("Ingredient updated successfully");
    });
  });

  describe("removeIngredient", () => {
    it("should delete an ingredient", async () => {
      ingredientsService.removeIngredient.mockResolvedValue(undefined);

      const result = await controller.removeIngredient(mockIngredientId);

      expect(ingredientsService.removeIngredient).toHaveBeenCalledWith(
        mockIngredientId,
      );
      expect(result.message).toBe("Ingredient deleted successfully");
    });
  });

  describe("findIngredientsByCategory", () => {
    it("should return ingredients by category", async () => {
      ingredientsService.findIngredientsByCategory.mockResolvedValue([
        mockIngredient,
      ] as any);

      const result = await controller.findIngredientsByCategory(mockCategoryId);

      expect(ingredientsService.findIngredientsByCategory).toHaveBeenCalledWith(
        mockCategoryId,
      );
      expect(result.message).toBe(
        "Category ingredients retrieved successfully",
      );
    });
  });
});
