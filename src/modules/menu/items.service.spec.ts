import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { IsNull, type Repository } from "typeorm";
import { ItemStatus } from "../../common/enums/ItemStatus";
import { Ingredient } from "../../database/entities/ingredient.entity";
import { Item } from "../../database/entities/item.entity";
import { UploadMediaService } from "../../services/upload-media/upload-media.service";
import { ItemsService } from "./items.service";

describe("ItemsService", () => {
  let service: ItemsService;
  let itemRepository: jest.Mocked<Repository<Item>>;
  let ingredientRepository: jest.Mocked<Repository<Ingredient>>;
  let uploadMediaService: jest.Mocked<UploadMediaService>;

  const mockItem: Partial<Item> = {
    id: "item-123",
    name: { en: "Test Item", ar: "عنصر تجريبي" },
    description: { en: "Test Description", ar: "وصف تجريبي" },
    image: "https://example.com/image.jpg",
    pricing: 100,
    tags: ["tag1", "tag2"],
    extras: [],
    ingredientsWithQuantity: [],
    status: ItemStatus.ACTIVE,
    sortOrder: 0,
    categoryId: "cat-123",
    createdBy: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockIngredient: Partial<Ingredient> = {
    id: "ing-123",
    name: { en: "Test Ingredient", ar: "مكون تجريبي" },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: getRepositoryToken(Item),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findBy: jest.fn(),
            softDelete: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Ingredient),
          useValue: {
            findBy: jest.fn(),
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

    service = module.get<ItemsService>(ItemsService);
    itemRepository = module.get(getRepositoryToken(Item));
    ingredientRepository = module.get(getRepositoryToken(Ingredient));
    uploadMediaService = module.get(UploadMediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto = {
      name: { en: "New Item", ar: "عنصر جديد" },
      description: { en: "Description", ar: "وصف" },
      pricing: 50,
      categoryId: "cat-123",
    };

    it("should create an item with numeric pricing", async () => {
      itemRepository.create.mockReturnValue(mockItem as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);

      const result = await service.create(createDto, "user-123", {});

      expect(result).toBeDefined();
      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: 50,
          createdBy: "user-123",
        })
      );
    });

    it("should create an item with string pricing", async () => {
      const dtoWithStringPricing = { ...createDto, pricing: "75" as any };
      itemRepository.create.mockReturnValue(mockItem as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);

      const result = await service.create(dtoWithStringPricing, "user-123", {});

      expect(result).toBeDefined();
      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: 75,
        })
      );
    });

    it("should create an item with object pricing (type: number)", async () => {
      const dtoWithObjectPricing = {
        ...createDto,
        pricing: { type: "number", price: "100" } as any,
      };
      itemRepository.create.mockReturnValue(mockItem as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);

      const result = await service.create(dtoWithObjectPricing, "user-123", {});

      expect(result).toBeDefined();
      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: 100,
        })
      );
    });

    it("should throw error for invalid string pricing", async () => {
      const dtoWithInvalidPricing = { ...createDto, pricing: "invalid" as any };
      itemRepository.create.mockReturnValue(mockItem as Item);

      await expect(
        service.create(dtoWithInvalidPricing, "user-123", {})
      ).rejects.toThrow("Invalid price string");
    });

    it("should throw error for invalid object pricing", async () => {
      const dtoWithInvalidPricing = {
        ...createDto,
        pricing: { type: "number", price: "invalid" } as any,
      };
      itemRepository.create.mockReturnValue(mockItem as Item);

      await expect(
        service.create(dtoWithInvalidPricing, "user-123", {})
      ).rejects.toThrow("Invalid price in pricing object");
    });

    it("should upload image when provided", async () => {
      itemRepository.create.mockReturnValue(mockItem as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: "https://example.com/new-image.jpg",
      } as any);

      const files = {
        image: [{ buffer: Buffer.from("test") }] as Express.Multer.File[],
      };

      await service.create(createDto, "user-123", files);

      expect(uploadMediaService.saveOneFile).toHaveBeenCalledWith(
        files.image,
        "properties",
        mockItem.id
      );
    });

    it("should link ingredients when ingredientIds provided", async () => {
      const dtoWithIngredients = {
        ...createDto,
        ingredientIds: ["ing-123", "ing-456"],
      };
      itemRepository.create.mockReturnValue(mockItem as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);
      ingredientRepository.findBy.mockResolvedValue([
        mockIngredient as Ingredient,
      ]);

      await service.create(dtoWithIngredients, "user-123", {});

      expect(ingredientRepository.findBy).toHaveBeenCalledWith({
        id: ["ing-123", "ing-456"],
      });
    });
  });

  describe("findAll", () => {
    it("should return paginated items with default values", async () => {
      const mockItems = [mockItem];
      itemRepository.query
        .mockResolvedValueOnce(mockItems)
        .mockResolvedValueOnce([{ total: "1" }]);

      const result = await service.findAll({});

      expect(result).toEqual({
        items: mockItems,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it("should apply search filter", async () => {
      itemRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ search: "test" });

      const queryCall = itemRepository.query.mock.calls[0];
      expect(queryCall[0]).toContain("ILIKE");
      expect(queryCall[1]).toContain("%test%");
    });

    it("should apply status filter", async () => {
      itemRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ status: ItemStatus.ACTIVE });

      const queryCall = itemRepository.query.mock.calls[0];
      expect(queryCall[0]).toContain("i.status");
      expect(queryCall[1]).toContain(ItemStatus.ACTIVE);
    });

    it("should apply category filter", async () => {
      itemRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ categoriesIds: ["cat-123"] });

      const queryCall = itemRepository.query.mock.calls[0];
      expect(queryCall[0]).toContain("categoryId");
    });

    it("should apply price range filter", async () => {
      itemRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ minPrice: 10, maxPrice: 100 });

      const queryCall = itemRepository.query.mock.calls[0];
      expect(queryCall[0]).toContain("BETWEEN");
      expect(queryCall[1]).toContain(10);
      expect(queryCall[1]).toContain(100);
    });

    it("should apply date range filter", async () => {
      const fromDate = new Date("2024-01-01");
      const toDate = new Date("2024-12-31");

      itemRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ fromDate, toDate });

      const queryCall = itemRepository.query.mock.calls[0];
      expect(queryCall[0]).toContain("updatedAt");
      expect(queryCall[0]).toContain("BETWEEN");
    });

    it("should sort by name", async () => {
      itemRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ sortBy: "name", sortOrder: "ASC" });

      const queryCall = itemRepository.query.mock.calls[0];
      expect(queryCall[0]).toContain("ORDER BY i.name");
    });

    it("should sort by pricing", async () => {
      itemRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ sortBy: "pricing", sortOrder: "DESC" });

      const queryCall = itemRepository.query.mock.calls[0];
      expect(queryCall[0]).toContain("pricing");
      expect(queryCall[0]).toContain("DESC");
    });
  });

  describe("findOne", () => {
    it("should return item when found", async () => {
      itemRepository.findOne.mockResolvedValue(mockItem as Item);

      const result = await service.findOne("item-123");

      expect(result).toEqual(mockItem);
      expect(itemRepository.findOne).toHaveBeenCalledWith({
        where: { id: "item-123", deletedAt: IsNull() },
        relations: ["category", "ingredients"],
      });
    });

    it("should throw NotFoundException when item not found", async () => {
      itemRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("update", () => {
    const updateDto = {
      name: { en: "Updated Item", ar: "عنصر محدث" },
      pricing: 150,
    };

    it("should update item successfully", async () => {
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      itemRepository.save.mockResolvedValue({
        ...mockItem,
        ...updateDto,
      } as Item);

      const result = await service.update("item-123", updateDto, "user-456", {});

      expect(result).toBeDefined();
      expect(itemRepository.save).toHaveBeenCalled();
    });

    it("should update pricing with string value", async () => {
      itemRepository.findOne.mockResolvedValue({ ...mockItem } as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);

      await service.update("item-123", { pricing: "200" as any }, "user-456", {});

      expect(itemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ pricing: 200 })
      );
    });

    it("should update pricing with object value", async () => {
      itemRepository.findOne.mockResolvedValue({ ...mockItem } as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);

      await service.update(
        "item-123",
        { pricing: { type: "number", price: "300" } as any },
        "user-456",
        {}
      );

      expect(itemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ pricing: 300 })
      );
    });

    it("should update image when provided", async () => {
      itemRepository.findOne.mockResolvedValue({ ...mockItem } as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: "https://example.com/updated-image.jpg",
      } as any);

      const files = {
        image: [{ buffer: Buffer.from("test") }] as Express.Multer.File[],
      };

      await service.update("item-123", {}, "user-456", files);

      expect(uploadMediaService.saveOneFile).toHaveBeenCalled();
    });

    it("should update ingredients", async () => {
      itemRepository.findOne.mockResolvedValue({ ...mockItem } as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);
      ingredientRepository.findBy.mockResolvedValue([mockIngredient as Ingredient]);

      await service.update(
        "item-123",
        { ingredientIds: ["ing-456"] },
        "user-456",
        {}
      );

      expect(ingredientRepository.findBy).toHaveBeenCalled();
    });

    it("should clear ingredients when empty array provided", async () => {
      itemRepository.findOne.mockResolvedValue({ ...mockItem } as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);

      await service.update(
        "item-123",
        { ingredientIds: [] },
        "user-456",
        {}
      );

      expect(itemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ ingredients: [] })
      );
    });

    it("should throw NotFoundException when item not found", async () => {
      itemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update("non-existent", updateDto, "user-456", {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft delete item", async () => {
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      itemRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove("item-123");

      expect(itemRepository.softDelete).toHaveBeenCalledWith("item-123");
    });

    it("should throw NotFoundException when item not found", async () => {
      itemRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("findByCategory", () => {
    it("should return active items in category", async () => {
      const items = [mockItem as Item];
      itemRepository.find.mockResolvedValue(items);

      const result = await service.findByCategory("cat-123");

      expect(result).toEqual(items);
      expect(itemRepository.find).toHaveBeenCalledWith({
        where: { categoryId: "cat-123", status: ItemStatus.ACTIVE, deletedAt: IsNull() },
        relations: ["ingredients"],
        order: { sortOrder: "ASC", createdAt: "DESC" },
      });
    });
  });

  describe("duplicate", () => {
    it("should create a copy of an item", async () => {
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      itemRepository.create.mockReturnValue({
        ...mockItem,
        id: "item-456",
        name: { en: "Test Item (Copy)", ar: "عنصر تجريبي (نسخة)" },
        status: ItemStatus.DRAFT,
      } as Item);
      itemRepository.save.mockResolvedValue(mockItem as Item);

      const result = await service.duplicate("item-123", "user-456");

      expect(result).toBeDefined();
      expect(itemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.objectContaining({
            en: expect.stringContaining("(Copy)"),
            ar: expect.stringContaining("(نسخة)"),
          }),
          status: ItemStatus.DRAFT,
          createdBy: "user-456",
        })
      );
    });

    it("should throw NotFoundException when original item not found", async () => {
      itemRepository.findOne.mockResolvedValue(null);

      await expect(service.duplicate("non-existent", "user-456")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("archiveItem", () => {
    it("should archive an item", async () => {
      itemRepository.findOne.mockResolvedValue({ ...mockItem } as Item);
      itemRepository.save.mockResolvedValue({
        ...mockItem,
        status: ItemStatus.ARCHIVED,
      } as Item);

      const result = await service.archiveItem("item-123", "user-456");

      expect(result.status).toBe(ItemStatus.ARCHIVED);
      expect(itemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ItemStatus.ARCHIVED,
          updatedBy: "user-456",
        })
      );
    });

    it("should throw NotFoundException when item not found", async () => {
      itemRepository.findOne.mockResolvedValue(null);

      await expect(service.archiveItem("non-existent", "user-456")).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
