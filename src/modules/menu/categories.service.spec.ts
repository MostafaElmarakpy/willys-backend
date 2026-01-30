import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { CategoriesService } from "./categories.service";
import { Category } from "src/database/entities/category.entity";
import { CategoryOrderBy } from "./dto/category/category-filter.dto";
import { UploadMediaService } from "src/services/upload-media/upload-media.service";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let categoryRepository: any;
  let uploadMediaService: jest.Mocked<UploadMediaService>;

  const mockUserId = "user-123";
  const mockCategoryId = "category-123";

  const mockCategory = {
    id: mockCategoryId,
    name: { en: "Main Category", ar: "الفئة الرئيسية" },
    description: { en: "Description", ar: "وصف" },
    image: null,
    isActive: true,
    sortOrder: 0,
    items: [],
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockFile = {
    fieldname: "image",
    originalname: "test.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024,
    buffer: Buffer.from("test"),
  } as Express.Multer.File;

  const createMockQueryBuilder = (results: any[] = [], count: number = 0) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    loadRelationCountAndMap: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([results, count]),
    getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
    from: jest.fn().mockReturnThis(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: {
            create: jest.fn().mockImplementation((data) => ({ ...data, id: mockCategoryId })),
            save: jest.fn().mockResolvedValue(mockCategory),
            findOne: jest.fn(),
            find: jest.fn(),
            softDelete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder([mockCategory], 1)),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                update: jest.fn(),
              },
            }),
          },
        },
        {
          provide: UploadMediaService,
          useValue: {
            saveOneFile: jest.fn().mockResolvedValue({ url: "https://example.com/image.jpg" }),
            deleteFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    categoryRepository = module.get(getRepositoryToken(Category));
    uploadMediaService = module.get(UploadMediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a category with auto sortOrder", async () => {
      const createDto = {
        name: { en: "New Category", ar: "فئة جديدة" },
        description: { en: "Description", ar: "وصف" },
      };

      const result = await service.create(createDto as any, mockUserId, {});

      expect(categoryRepository.create).toHaveBeenCalled();
      expect(categoryRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should create a category with image file", async () => {
      const createDto = {
        name: { en: "New Category", ar: "فئة جديدة" },
        description: { en: "Description", ar: "وصف" },
      };

      categoryRepository.save.mockResolvedValueOnce({ ...mockCategory, id: mockCategoryId });
      categoryRepository.save.mockResolvedValueOnce({
        ...mockCategory,
        id: mockCategoryId,
        image: "https://example.com/image.jpg",
      });

      const result = await service.create(createDto as any, mockUserId, { image: [mockFile] });

      expect(categoryRepository.create).toHaveBeenCalled();
      expect(categoryRepository.save).toHaveBeenCalledTimes(2);
      expect(uploadMediaService.saveOneFile).toHaveBeenCalledWith(
        [mockFile],
        "properties",
        mockCategoryId,
      );
      expect(result).toBeDefined();
    });

    it("should create a category without image", async () => {
      const createDto = {
        name: { en: "New Category", ar: "فئة جديدة" },
      };

      const result = await service.create(createDto as any, mockUserId, {});

      expect(categoryRepository.create).toHaveBeenCalled();
      expect(categoryRepository.save).toHaveBeenCalledTimes(1);
      expect(uploadMediaService.saveOneFile).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("findAll", () => {
    it("should return paginated categories", async () => {
      const result = await service.findAll(1, 10);

      expect(result.categories).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should filter by search term", async () => {
      await service.findAll(1, 10, "test");

      expect(categoryRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should filter by isActive status", async () => {
      await service.findAll(1, 10, undefined, "true");

      expect(categoryRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should sort by sortOrder", async () => {
      await service.findAll(1, 10, undefined, undefined, CategoryOrderBy.SORT_ORDER, "ASC");

      expect(categoryRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should sort by updatedAt", async () => {
      await service.findAll(1, 10, undefined, undefined, CategoryOrderBy.UPDATED_AT, "DESC");

      expect(categoryRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should sort by items count", async () => {
      await service.findAll(1, 10, undefined, undefined, CategoryOrderBy.ITEMS_COUNT, "DESC");

      expect(categoryRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("should return a category by id", async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne(mockCategoryId);

      expect(categoryRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockCategory);
    });

    it("should throw NotFoundException when category not found", async () => {
      categoryRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockCategoryId)).rejects.toThrow(NotFoundException);
    });
  });

  describe("update", () => {
    it("should update a category", async () => {
      const updateDto = { name: { en: "Updated Category", ar: "فئة محدثة" } };
      categoryRepository.findOne.mockResolvedValue({ ...mockCategory });
      categoryRepository.save.mockResolvedValue({ ...mockCategory, ...updateDto });

      const result = await service.update(mockCategoryId, updateDto as any, mockUserId, {});

      expect(categoryRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should update a category with new image file", async () => {
      const updateDto = { name: { en: "Updated Category", ar: "فئة محدثة" } };
      categoryRepository.findOne.mockResolvedValue({ ...mockCategory });
      categoryRepository.save.mockResolvedValue({
        ...mockCategory,
        ...updateDto,
        image: "https://example.com/image.jpg",
      });

      const result = await service.update(mockCategoryId, updateDto as any, mockUserId, {
        image: [mockFile],
      });

      expect(categoryRepository.save).toHaveBeenCalled();
      expect(uploadMediaService.saveOneFile).toHaveBeenCalledWith(
        [mockFile],
        "properties",
        mockCategoryId,
      );
      expect(result).toBeDefined();
    });

    it("should update a category without changing image", async () => {
      const updateDto = { name: { en: "Updated Category", ar: "فئة محدثة" } };
      categoryRepository.findOne.mockResolvedValue({ ...mockCategory });
      categoryRepository.save.mockResolvedValue({ ...mockCategory, ...updateDto });

      const result = await service.update(mockCategoryId, updateDto as any, mockUserId, {});

      expect(categoryRepository.save).toHaveBeenCalled();
      expect(uploadMediaService.saveOneFile).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("remove", () => {
    it("should soft delete a category", async () => {
      categoryRepository.findOne.mockResolvedValue(mockCategory);
      categoryRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(mockCategoryId);

      expect(categoryRepository.softDelete).toHaveBeenCalledWith(mockCategoryId);
    });
  });

  describe("findActiveCategories", () => {
    it("should return active categories", async () => {
      categoryRepository.find.mockResolvedValue([mockCategory]);

      const result = await service.findActiveCategories();

      expect(categoryRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
