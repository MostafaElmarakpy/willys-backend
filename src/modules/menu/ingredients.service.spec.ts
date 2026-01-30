import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { IngredientsService } from "./ingredients.service";
import { Ingredient } from "src/database/entities/ingredient.entity";
import { IngredientCategory } from "src/database/entities/ingredient-category.entity";

describe("IngredientsService", () => {
  let service: IngredientsService;
  let ingredientRepository: any;
  let ingredientCategoryRepository: any;

  const mockUserId = "user-123";
  const mockCategoryId = "category-123";
  const mockIngredientId = "ingredient-123";

  const mockCategory = {
    id: mockCategoryId,
    name: { en: "Sauces", ar: "صوصات" },
    description: { en: "Description", ar: "وصف" },
    isActive: true,
    sortOrder: 1,
    ingredients: [],
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockIngredient = {
    id: mockIngredientId,
    name: { en: "Ketchup", ar: "كاتشب" },
    price: 5.0,
    categoryId: mockCategoryId,
    category: mockCategory,
    isActive: true,
    isDefaultExtra: false,
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const createMockQueryBuilder = (results: any[], count: number) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([results, count]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientsService,
        {
          provide: getRepositoryToken(Ingredient),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({ ...data, id: mockIngredientId })),
            save: jest.fn().mockResolvedValue(mockIngredient),
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(IngredientCategory),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({ ...data, id: mockCategoryId })),
            save: jest.fn().mockResolvedValue(mockCategory),
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IngredientsService>(IngredientsService);
    ingredientRepository = module.get(getRepositoryToken(Ingredient));
    ingredientCategoryRepository = module.get(getRepositoryToken(IngredientCategory));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCategory", () => {
    it("should create an ingredient category", async () => {
      const createDto = {
        name: { en: "New Category", ar: "فئة جديدة" },
        description: { en: "Description", ar: "وصف" },
      };

      const result = await service.createCategory(createDto as any, mockUserId);

      expect(ingredientCategoryRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdBy: mockUserId,
      });
      expect(ingredientCategoryRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("findAllCategories", () => {
    it("should return paginated categories", async () => {
      ingredientCategoryRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([mockCategory], 1),
      );

      const result = await service.findAllCategories(1, 10);

      expect(result.categories).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should filter by search term", async () => {
      ingredientCategoryRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([mockCategory], 1),
      );

      await service.findAllCategories(1, 10, "sauce");

      expect(ingredientCategoryRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should sort by name", async () => {
      ingredientCategoryRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([mockCategory], 1),
      );

      await service.findAllCategories(1, 10, undefined, "name", "ASC");

      expect(ingredientCategoryRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe("findOneCategory", () => {
    it("should return a category by id", async () => {
      ingredientCategoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOneCategory(mockCategoryId);

      expect(result).toEqual(mockCategory);
    });

    it("should throw NotFoundException when category not found", async () => {
      ingredientCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneCategory(mockCategoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateCategory", () => {
    it("should update an ingredient category", async () => {
      const updateDto = { name: { en: "Updated Category", ar: "فئة محدثة" } };
      ingredientCategoryRepository.findOne.mockResolvedValue({ ...mockCategory });
      ingredientCategoryRepository.save.mockResolvedValue({
        ...mockCategory,
        ...updateDto,
      });

      const result = await service.updateCategory(mockCategoryId, updateDto as any, mockUserId);

      expect(ingredientCategoryRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("removeCategory", () => {
    it("should soft delete a category", async () => {
      ingredientCategoryRepository.findOne.mockResolvedValue(mockCategory);
      ingredientCategoryRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.removeCategory(mockCategoryId);

      expect(ingredientCategoryRepository.softDelete).toHaveBeenCalledWith(mockCategoryId);
    });
  });

  describe("createIngredient", () => {
    it("should create an ingredient", async () => {
      const createDto = {
        name: { en: "New Ingredient", ar: "مكون جديد" },
        price: 10.0,
        categoryId: mockCategoryId,
      };
      ingredientCategoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.createIngredient(createDto as any, mockUserId);

      expect(ingredientRepository.create).toHaveBeenCalled();
      expect(ingredientRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when category not found", async () => {
      const createDto = {
        name: { en: "New Ingredient", ar: "مكون جديد" },
        price: 10.0,
        categoryId: "non-existent",
      };
      ingredientCategoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createIngredient(createDto as any, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAllIngredients", () => {
    it("should return paginated ingredients", async () => {
      ingredientRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([mockIngredient], 1),
      );

      const result = await service.findAllIngredients(1, 10);

      expect(result.ingredients).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should filter by category", async () => {
      ingredientRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([mockIngredient], 1),
      );

      await service.findAllIngredients(1, 10, undefined, mockCategoryId);

      expect(ingredientRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should sort by price", async () => {
      ingredientRepository.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder([mockIngredient], 1),
      );

      await service.findAllIngredients(1, 10, undefined, undefined, "price", "ASC");

      expect(ingredientRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe("findOneIngredient", () => {
    it("should return an ingredient by id", async () => {
      ingredientRepository.findOne.mockResolvedValue(mockIngredient);

      const result = await service.findOneIngredient(mockIngredientId);

      expect(result).toEqual(mockIngredient);
    });

    it("should throw NotFoundException when ingredient not found", async () => {
      ingredientRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneIngredient(mockIngredientId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateIngredient", () => {
    it("should update an ingredient", async () => {
      const updateDto = { price: 15.0 };
      ingredientRepository.findOne.mockResolvedValue({ ...mockIngredient });
      ingredientRepository.save.mockResolvedValue({
        ...mockIngredient,
        ...updateDto,
      });

      const result = await service.updateIngredient(mockIngredientId, updateDto as any, mockUserId);

      expect(ingredientRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("removeIngredient", () => {
    it("should soft delete an ingredient", async () => {
      ingredientRepository.findOne.mockResolvedValue(mockIngredient);
      ingredientRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.removeIngredient(mockIngredientId);

      expect(ingredientRepository.softDelete).toHaveBeenCalledWith(mockIngredientId);
    });
  });

  describe("findActiveCategories", () => {
    it("should return active categories", async () => {
      ingredientCategoryRepository.find.mockResolvedValue([mockCategory]);

      const result = await service.findActiveCategories();

      expect(ingredientCategoryRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe("findIngredientsByCategory", () => {
    it("should return ingredients by category", async () => {
      ingredientRepository.find.mockResolvedValue([mockIngredient]);

      const result = await service.findIngredientsByCategory(mockCategoryId);

      expect(ingredientRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe("findDefaultExtras", () => {
    it("should return default extra ingredients", async () => {
      const defaultExtra = { ...mockIngredient, isDefaultExtra: true };
      ingredientRepository.find.mockResolvedValue([defaultExtra]);

      const result = await service.findDefaultExtras();

      expect(ingredientRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
