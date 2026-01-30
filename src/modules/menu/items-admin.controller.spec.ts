import { Test, type TestingModule } from "@nestjs/testing";
import { S3StorageService } from "../../services/upload-media/multer-config.service";
import { ItemsAdminController } from "./items-admin.controller";
import { ItemsService } from "./items.service";

describe("ItemsAdminController", () => {
  let controller: ItemsAdminController;
  let itemsService: jest.Mocked<ItemsService>;

  const mockUserId = "admin-123";
  const mockItemId = "item-123";
  const mockCategoryId = "category-123";

  const mockItem = {
    id: mockItemId,
    name: { en: "Cheese Burger", ar: "تشيز برجر" },
    price: 50,
    status: "active",
    categoryId: mockCategoryId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsAdminController],
      providers: [
        {
          provide: ItemsService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            findByCategory: jest.fn(),
            duplicate: jest.fn(),
            archiveItem: jest.fn(),
          },
        },
        {
          provide: S3StorageService,
          useValue: {
            multerOptions: jest.fn().mockReturnValue({}),
            validateFileSize: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ItemsAdminController>(ItemsAdminController);
    itemsService = module.get(ItemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated items", async () => {
      const paginatedResult = {
        items: [mockItem],
        total: 1,
        page: 1,
        limit: 10,
      };
      itemsService.findAll.mockResolvedValue(paginatedResult as any);

      const filterDto = { page: 1, limit: 10 };
      const result = await controller.findAll(filterDto);

      expect(itemsService.findAll).toHaveBeenCalledWith(filterDto);
      expect(result.message).toBe("Items retrieved successfully");
    });
  });

  describe("create", () => {
    it("should create an item with images", async () => {
      const createDto = {
        name: { en: "New Item" },
        price: 60,
      } as any;
      const files = {
        image: [{ fieldname: "image", originalname: "item.jpg" }],
      } as any;
      itemsService.create.mockResolvedValue(mockItem as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.create(files, createDto, mockReq);

      expect(itemsService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
        files,
      );
      expect(result.message).toBe("Item created successfully");
    });
  });

  describe("findOne", () => {
    it("should return item by id", async () => {
      itemsService.findOne.mockResolvedValue(mockItem as any);

      const result = await controller.findOne(mockItemId);

      expect(itemsService.findOne).toHaveBeenCalledWith(mockItemId);
      expect(result.message).toBe("Item retrieved successfully");
    });
  });

  describe("update", () => {
    it("should update an item", async () => {
      const updateDto = { price: 55 } as any;
      const files = {} as any;
      const updatedItem = { ...mockItem, price: 55 };
      itemsService.update.mockResolvedValue(updatedItem as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.update(
        mockItemId,
        files,
        updateDto,
        mockReq,
      );

      expect(itemsService.update).toHaveBeenCalledWith(
        mockItemId,
        updateDto,
        mockUserId,
        files,
      );
      expect(result.message).toBe("Item updated successfully");
    });
  });

  describe("remove", () => {
    it("should delete an item", async () => {
      itemsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockItemId);

      expect(itemsService.remove).toHaveBeenCalledWith(mockItemId);
      expect(result.message).toBe("Item deleted successfully");
    });
  });

  describe("findByCategory", () => {
    it("should return items by category", async () => {
      itemsService.findByCategory.mockResolvedValue([mockItem] as any);

      const result = await controller.findByCategory(mockCategoryId);

      expect(itemsService.findByCategory).toHaveBeenCalledWith(mockCategoryId);
      expect(result.message).toBe("Category items retrieved successfully");
    });
  });

  describe("duplicate", () => {
    it("should duplicate an item", async () => {
      const duplicatedItem = { ...mockItem, id: "item-copy" };
      itemsService.duplicate.mockResolvedValue(duplicatedItem as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.duplicate(mockItemId, mockReq);

      expect(itemsService.duplicate).toHaveBeenCalledWith(mockItemId, mockUserId);
      expect(result.message).toBe("Item duplicated successfully");
    });
  });

  describe("archive", () => {
    it("should archive an item", async () => {
      const archivedItem = { ...mockItem, status: "archived" };
      itemsService.archiveItem.mockResolvedValue(archivedItem as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.archive(mockItemId, mockReq);

      expect(itemsService.archiveItem).toHaveBeenCalledWith(
        mockItemId,
        mockUserId,
      );
      expect(result.message).toBe("Item archived successfully");
    });
  });
});
