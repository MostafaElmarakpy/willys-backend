import { NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, IsNull, type Repository, type SelectQueryBuilder } from "typeorm";
import { Category } from "../../database/entities/category.entity";
import { CategoriesService } from "./categories.service";
import { CategoryOrderBy } from "./dto/category/category-filter.dto";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<Category>>;

  const mockCategory: Partial<Category> = {
    id: "cat-123",
    name: { en: "Test Category", ar: "فئة تجريبية" },
    description: { en: "Test Description", ar: "وصف تجريبي" },
    isActive: true,
    sortOrder: 0,
    createdBy: "user-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getManyAndCount: jest.fn(),
      loadRelationCountAndMap: jest.fn().mockReturnThis(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoryRepository = module.get(getRepositoryToken(Category));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createDto = {
      name: { en: "New Category", ar: "فئة جديدة" },
      description: { en: "Description", ar: "وصف" },
      isActive: true,
    };

    it("should create a category with correct sortOrder", async () => {
      queryBuilder.getRawOne.mockResolvedValue({ max: 5 });
      categoryRepository.create.mockReturnValue(mockCategory as Category);
      categoryRepository.save.mockResolvedValue(mockCategory as Category);

      const result = await service.create(createDto, "user-123");

      expect(result).toBeDefined();
      expect(categoryRepository.create).toHaveBeenCalledWith({
        ...createDto,
        sortOrder: 6,
        createdBy: "user-123",
      });
      expect(categoryRepository.save).toHaveBeenCalled();
    });

    it("should set sortOrder to 0 when no categories exist", async () => {
      queryBuilder.getRawOne.mockResolvedValue({ max: null });
      categoryRepository.create.mockReturnValue(mockCategory as Category);
      categoryRepository.save.mockResolvedValue(mockCategory as Category);

      await service.create(createDto, "user-123");

      expect(categoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 0 })
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated categories with default values", async () => {
      const mockCategories = [mockCategory as Category];
      queryBuilder.getManyAndCount.mockResolvedValue([mockCategories, 1]);

      const result = await service.findAll();

      expect(result).toEqual({
        categories: mockCategories,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it("should apply search filter", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, "test");

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "(category.name ->> 'en' ILIKE :search OR category.name ->> 'ar' ILIKE :search)",
        { search: "%test%" }
      );
    });

    it("should apply isActive filter when true", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, undefined, "true");

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "category.isActive = :isActive",
        { isActive: true }
      );
    });

    it("should apply isActive filter when false", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, undefined, "false");

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "category.isActive = :isActive",
        { isActive: false }
      );
    });

    it("should order by sortOrder when specified", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, undefined, undefined, CategoryOrderBy.SORT_ORDER, "DESC");

      expect(queryBuilder.orderBy).toHaveBeenCalledWith("category.sortOrder", "DESC");
    });

    it("should order by updatedAt when specified", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, undefined, undefined, CategoryOrderBy.UPDATED_AT, "ASC");

      expect(queryBuilder.orderBy).toHaveBeenCalledWith("category.updatedAt", "ASC");
    });

    it("should order by items count when specified", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, undefined, undefined, CategoryOrderBy.ITEMS_COUNT, "DESC");

      expect(queryBuilder.addSelect).toHaveBeenCalled();
      expect(queryBuilder.orderBy).toHaveBeenCalledWith("items_count", "DESC");
    });

    it("should calculate correct pagination", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll(2, 10);

      expect(result.totalPages).toBe(3);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    });
  });

  describe("findOne", () => {
    it("should return category when found", async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory as Category);

      const result = await service.findOne("cat-123");

      expect(result).toEqual(mockCategory);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: "cat-123", deletedAt: IsNull() },
        relations: ["items"],
      });
    });

    it("should throw NotFoundException when category not found", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("update", () => {
    const updateDto = {
      name: { en: "Updated Category", ar: "فئة محدثة" },
      isActive: false,
    };

    it("should update category successfully", async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory as Category);
      categoryRepository.save.mockResolvedValue({
        ...mockCategory,
        ...updateDto,
        updatedBy: "user-456",
      } as Category);

      const result = await service.update("cat-123", updateDto, "user-456");

      expect(result.name).toEqual(updateDto.name);
      expect(categoryRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when category not found", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.update("non-existent", updateDto, "user-456")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("remove", () => {
    it("should soft delete category", async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory as Category);
      categoryRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove("cat-123");

      expect(categoryRepository.softDelete).toHaveBeenCalledWith("cat-123");
    });

    it("should throw NotFoundException when category not found", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("findActiveCategories", () => {
    it("should return only active categories", async () => {
      const activeCategories = [mockCategory as Category];
      categoryRepository.find.mockResolvedValue(activeCategories);

      const result = await service.findActiveCategories();

      expect(result).toEqual(activeCategories);
      expect(categoryRepository.find).toHaveBeenCalledWith({
        where: { isActive: true, deletedAt: IsNull() },
        order: { sortOrder: "ASC", createdAt: "DESC" },
      });
    });
  });

  describe("reorderCategories", () => {
    const reorderDto = {
      categories: [
        { id: "cat-1", sortOrder: 2 },
        { id: "cat-2", sortOrder: 1 },
        { id: "cat-3", sortOrder: 0 },
      ],
    };

    it("should reorder categories successfully", async () => {
      const mockCategoryRepo = {
        find: jest.fn().mockResolvedValue([
          { id: "cat-1" },
          { id: "cat-2" },
          { id: "cat-3" },
        ]),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (manager: any) => Promise<any>) => {
          return cb({
            getRepository: () => mockCategoryRepo,
          });
        }
      );

      const result = await service.reorderCategories(reorderDto);

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(3);
      expect(mockCategoryRepo.update).toHaveBeenCalledTimes(3);
    });

    it("should throw NotFoundException when some categories not found", async () => {
      const mockCategoryRepo = {
        find: jest.fn().mockResolvedValue([{ id: "cat-1" }]),
        update: jest.fn(),
      };

      (dataSource.transaction as jest.Mock).mockImplementation(
        async (cb: (manager: any) => Promise<any>) => {
          return cb({
            getRepository: () => mockCategoryRepo,
          });
        }
      );

      await expect(service.reorderCategories(reorderDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
