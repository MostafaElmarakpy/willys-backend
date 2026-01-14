import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DiscountStatus } from "../../common/enums/DiscountStatus";
import { DiscountTargetType } from "../../common/enums/DiscountTargetType";
import { DiscountType } from "../../common/enums/DiscountType";
import { Discount } from "../../database/entities/discount.entity";
import { DiscountUsageLog } from "../../database/entities/discount-usage-log.entity";
import { ItemDiscount } from "../../database/entities/item-discount.entity";
import { UserDiscount } from "../../database/entities/user-discount.entity";
import { DiscountsService } from "./discounts.service";
import { CreateDiscountDto } from "./dto/create-discount.dto";
import { DiscountFilterDto } from "./dto/discount-filter.dto";
import { UpdateDiscountDto } from "./dto/update-discount.dto";

describe("DiscountsService", () => {
  let service: DiscountsService;
  let discountRepository: jest.Mocked<Repository<Discount>>;
  let userDiscountRepository: jest.Mocked<Repository<UserDiscount>>;
  let itemDiscountRepository: jest.Mocked<Repository<ItemDiscount>>;
  let usageLogRepository: jest.Mocked<Repository<DiscountUsageLog>>;

  // Mock data
  const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
  const mockAdminId = "550e8400-e29b-41d4-a716-446655440001";
  const mockDiscountId = "550e8400-e29b-41d4-a716-446655440002";
  const mockItemId = "550e8400-e29b-41d4-a716-446655440003";
  const mockOrderId = "550e8400-e29b-41d4-a716-446655440004";

  const mockDiscount: Partial<Discount> = {
    id: mockDiscountId,
    code: "SAVE10",
    name: { en: "10% Off", ar: "خصم 10%" },
    description: { en: "Save 10%", ar: "وفر 10%" },
    type: DiscountType.PERCENTAGE,
    targetType: DiscountTargetType.USER,
    value: 10,
    minimumPurchase: 50,
    maxUsageTotal: 100,
    maxUsagePerUser: 3,
    currentUsageCount: 0,
    startDate: new Date(Date.now() - 86400000), // Yesterday
    endDate: new Date(Date.now() + 86400000 * 30), // 30 days from now
    status: DiscountStatus.ACTIVE,
    isActive: true,
    createdBy: mockAdminId,
    deletedAt: undefined,
  };

  const mockFixedDiscount: Partial<Discount> = {
    ...mockDiscount,
    id: "550e8400-e29b-41d4-a716-446655440010",
    code: "FLAT20",
    name: { en: "$20 Off", ar: "خصم 20 جنيه" },
    type: DiscountType.FIXED_AMOUNT,
    value: 20,
  };

  const mockBuyXGetYDiscount: Partial<Discount> = {
    ...mockDiscount,
    id: "550e8400-e29b-41d4-a716-446655440011",
    code: "B2G1",
    name: { en: "Buy 2 Get 1", ar: "اشتري 2 واحصل على 1" },
    type: DiscountType.BUY_X_GET_Y,
    value: 0,
    buyQuantity: 2,
    getQuantity: 1,
  };

  const mockFreeItemDiscount: Partial<Discount> = {
    ...mockDiscount,
    id: "550e8400-e29b-41d4-a716-446655440012",
    code: "FREEITEM",
    name: { en: "Free Item", ar: "منتج مجاني" },
    type: DiscountType.FREE_ITEM,
    value: 0,
    freeItemId: mockItemId,
  };

  const mockItemTargetedDiscount: Partial<Discount> = {
    ...mockDiscount,
    id: "550e8400-e29b-41d4-a716-446655440013",
    targetType: DiscountTargetType.ITEM,
  };

  const mockUserDiscount: Partial<UserDiscount> = {
    userId: mockUserId,
    discountId: mockDiscountId,
    usageCount: 0,
    assignedBy: mockAdminId,
    assignedAt: new Date(),
  };

  const mockItemDiscount: Partial<ItemDiscount> = {
    itemId: mockItemId,
    discountId: mockDiscountId,
    assignedBy: mockAdminId,
    assignedAt: new Date(),
  };

  const mockUsageLog: Partial<DiscountUsageLog> = {
    discountId: mockDiscountId,
    userId: mockUserId,
    discountAmount: 10,
    usedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscountsService,
        {
          provide: getRepositoryToken(Discount),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserDiscount),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ItemDiscount),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DiscountUsageLog),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DiscountsService>(DiscountsService);
    discountRepository = module.get(getRepositoryToken(Discount));
    userDiscountRepository = module.get(getRepositoryToken(UserDiscount));
    itemDiscountRepository = module.get(getRepositoryToken(ItemDiscount));
    usageLogRepository = module.get(getRepositoryToken(DiscountUsageLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a percentage discount successfully", async () => {
      const createDto: CreateDiscountDto = {
        code: "NEWDISCOUNT",
        name: { en: "New Discount", ar: "خصم جديد" },
        type: DiscountType.PERCENTAGE,
        targetType: DiscountTargetType.USER,
        value: 15,
        startDate: new Date().toISOString(),
      };

      discountRepository.findOne.mockResolvedValue(null);
      discountRepository.create.mockReturnValue(mockDiscount as Discount);
      discountRepository.save.mockResolvedValue({
        ...mockDiscount,
        id: mockDiscountId,
      } as Discount);

      const result = await service.create(createDto, mockAdminId);

      expect(discountRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdBy: mockAdminId,
      });
      expect(discountRepository.save).toHaveBeenCalled();
      expect(result.id).toBeDefined();
    });

    it("should throw BadRequestException when code already exists", async () => {
      const createDto: CreateDiscountDto = {
        code: "SAVE10",
        name: { en: "Duplicate", ar: "مكرر" },
        type: DiscountType.PERCENTAGE,
        targetType: DiscountTargetType.USER,
        value: 10,
        startDate: new Date().toISOString(),
      };

      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);

      await expect(service.create(createDto, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when percentage value is over 100", async () => {
      const createDto: CreateDiscountDto = {
        name: { en: "Invalid", ar: "غير صالح" },
        type: DiscountType.PERCENTAGE,
        targetType: DiscountTargetType.USER,
        value: 150,
        startDate: new Date().toISOString(),
      };

      await expect(service.create(createDto, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when percentage value is negative", async () => {
      const createDto: CreateDiscountDto = {
        name: { en: "Invalid", ar: "غير صالح" },
        type: DiscountType.PERCENTAGE,
        targetType: DiscountTargetType.USER,
        value: -10,
        startDate: new Date().toISOString(),
      };

      await expect(service.create(createDto, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when fixed amount is negative", async () => {
      const createDto: CreateDiscountDto = {
        name: { en: "Invalid", ar: "غير صالح" },
        type: DiscountType.FIXED_AMOUNT,
        targetType: DiscountTargetType.USER,
        value: -20,
        startDate: new Date().toISOString(),
      };

      await expect(service.create(createDto, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when BUY_X_GET_Y missing quantities", async () => {
      const createDto: CreateDiscountDto = {
        name: { en: "Invalid", ar: "غير صالح" },
        type: DiscountType.BUY_X_GET_Y,
        targetType: DiscountTargetType.USER,
        value: 0,
        startDate: new Date().toISOString(),
      };

      await expect(service.create(createDto, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when FREE_ITEM missing freeItemId", async () => {
      const createDto: CreateDiscountDto = {
        name: { en: "Invalid", ar: "غير صالح" },
        type: DiscountType.FREE_ITEM,
        targetType: DiscountTargetType.USER,
        value: 0,
        startDate: new Date().toISOString(),
      };

      await expect(service.create(createDto, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when endDate is before startDate", async () => {
      const createDto: CreateDiscountDto = {
        name: { en: "Invalid", ar: "غير صالح" },
        type: DiscountType.PERCENTAGE,
        targetType: DiscountTargetType.USER,
        value: 10,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date().toISOString(),
      };

      await expect(service.create(createDto, mockAdminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should create discount without code", async () => {
      const createDto: CreateDiscountDto = {
        name: { en: "No Code", ar: "بدون كود" },
        type: DiscountType.PERCENTAGE,
        targetType: DiscountTargetType.USER,
        value: 10,
        startDate: new Date().toISOString(),
      };

      discountRepository.create.mockReturnValue(mockDiscount as Discount);
      discountRepository.save.mockResolvedValue({
        ...mockDiscount,
        id: mockDiscountId,
      } as Discount);

      const result = await service.create(createDto, mockAdminId);

      expect(discountRepository.findOne).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("findAll", () => {
    it("should return paginated discounts", async () => {
      const mockDiscounts = [mockDiscount];
      discountRepository.query
        .mockResolvedValueOnce(mockDiscounts)
        .mockResolvedValueOnce([{ total: "1" }])
        .mockResolvedValueOnce([{ active_count: "1" }])
        .mockResolvedValueOnce([{ inactive_count: "0" }])
        .mockResolvedValueOnce([{ percentage_count: "1" }]);

      const filterDto: DiscountFilterDto = { page: 1, limit: 10 };
      const result = await service.findAll(filterDto);

      expect(result.discounts).toEqual(mockDiscounts);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.activeCount).toBe(1);
    });

    it("should apply search filter", async () => {
      discountRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([{ active_count: "0" }])
        .mockResolvedValueOnce([{ inactive_count: "0" }])
        .mockResolvedValueOnce([{ percentage_count: "0" }]);

      const filterDto: DiscountFilterDto = {
        search: "SAVE",
        page: 1,
        limit: 10,
      };
      await service.findAll(filterDto);

      expect(discountRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        expect.arrayContaining(["%SAVE%"]),
      );
    });

    it("should apply status filter", async () => {
      discountRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([{ active_count: "0" }])
        .mockResolvedValueOnce([{ inactive_count: "0" }])
        .mockResolvedValueOnce([{ percentage_count: "0" }]);

      const filterDto: DiscountFilterDto = {
        status: DiscountStatus.ACTIVE,
        page: 1,
        limit: 10,
      };
      await service.findAll(filterDto);

      expect(discountRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("d.status ="),
        expect.arrayContaining([DiscountStatus.ACTIVE]),
      );
    });

    it("should apply type filter", async () => {
      discountRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([{ active_count: "0" }])
        .mockResolvedValueOnce([{ inactive_count: "0" }])
        .mockResolvedValueOnce([{ percentage_count: "0" }]);

      const filterDto: DiscountFilterDto = {
        type: DiscountType.PERCENTAGE,
        page: 1,
        limit: 10,
      };
      await service.findAll(filterDto);

      expect(discountRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("d.type ="),
        expect.arrayContaining([DiscountType.PERCENTAGE]),
      );
    });

    it("should apply date range filter", async () => {
      discountRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([{ active_count: "0" }])
        .mockResolvedValueOnce([{ inactive_count: "0" }])
        .mockResolvedValueOnce([{ percentage_count: "0" }]);

      const startDate = "2026-01-01";
      const endDate = "2026-12-31";
      const filterDto: DiscountFilterDto = {
        startDate,
        endDate,
        page: 1,
        limit: 10,
      };
      await service.findAll(filterDto);

      expect(discountRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("BETWEEN"),
        expect.arrayContaining([startDate, endDate]),
      );
    });

    it("should apply value range filter", async () => {
      discountRepository.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([{ active_count: "0" }])
        .mockResolvedValueOnce([{ inactive_count: "0" }])
        .mockResolvedValueOnce([{ percentage_count: "0" }]);

      const filterDto: DiscountFilterDto = {
        minValue: 5,
        maxValue: 20,
        page: 1,
        limit: 10,
      };
      await service.findAll(filterDto);

      expect(discountRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("d.value BETWEEN"),
        expect.arrayContaining([5, 20]),
      );
    });
  });

  describe("findOne", () => {
    it("should return a discount when found", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);

      const result = await service.findOne(mockDiscountId);

      expect(result).toEqual(mockDiscount);
      expect(discountRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockDiscountId, deletedAt: expect.anything() },
        relations: ["freeItem", "createdByUser", "updatedByUser"],
      });
    });

    it("should throw NotFoundException when discount not found", async () => {
      discountRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByCode", () => {
    it("should return a discount when found by code", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);

      const result = await service.findByCode("SAVE10");

      expect(result).toEqual(mockDiscount);
      expect(discountRepository.findOne).toHaveBeenCalledWith({
        where: { code: "SAVE10", deletedAt: expect.anything() },
        relations: ["freeItem"],
      });
    });

    it("should return null when discount not found", async () => {
      discountRepository.findOne.mockResolvedValue(null);

      const result = await service.findByCode("INVALID");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    beforeEach(() => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
      discountRepository.save.mockImplementation((discount) =>
        Promise.resolve(discount as Discount),
      );
    });

    it("should update a discount successfully", async () => {
      const updateDto: UpdateDiscountDto = { value: 20 };

      const result = await service.update(
        mockDiscountId,
        updateDto,
        mockAdminId,
      );

      expect(result.value).toBe(20);
      expect(result.updatedBy).toBe(mockAdminId);
    });

    it("should throw BadRequestException when trying to change targetType", async () => {
      const updateDto: UpdateDiscountDto = {
        targetType: DiscountTargetType.ITEM,
      };

      await expect(
        service.update(mockDiscountId, updateDto, mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when discount not found", async () => {
      discountRepository.findOne.mockResolvedValue(null);
      const updateDto: UpdateDiscountDto = { value: 20 };

      await expect(
        service.update("non-existent", updateDto, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft delete a discount", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
      discountRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockDiscountId);

      expect(discountRepository.softDelete).toHaveBeenCalledWith(
        mockDiscountId,
      );
    });

    it("should throw NotFoundException when discount not found", async () => {
      discountRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("duplicate", () => {
    it("should create a copy of an existing discount", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
      discountRepository.create.mockImplementation((data) => data as Discount);
      discountRepository.save.mockImplementation((discount) =>
        Promise.resolve({ ...discount, id: "new-id" } as Discount),
      );

      const result = await service.duplicate(mockDiscountId, mockAdminId);

      expect(discountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "SAVE10_COPY",
          name: { ar: "خصم 10% - نسخة", en: "10% Off - Copy" },
          status: DiscountStatus.SCHEDULED,
          isActive: false,
          createdBy: mockAdminId,
        }),
      );
      expect(result.id).toBe("new-id");
    });

    it("should handle discount without code", async () => {
      const discountWithoutCode = { ...mockDiscount, code: undefined };
      discountRepository.findOne.mockResolvedValue(
        discountWithoutCode as Discount,
      );
      discountRepository.create.mockImplementation((data) => data as Discount);
      discountRepository.save.mockImplementation((discount) =>
        Promise.resolve({ ...discount, id: "new-id" } as Discount),
      );

      await service.duplicate(mockDiscountId, mockAdminId);

      expect(discountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: undefined,
        }),
      );
    });
  });

  describe("assignToUsers", () => {
    it("should assign USER-targeted discount to users", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
      userDiscountRepository.save.mockResolvedValue([] as any);

      const userIds = [mockUserId, "user-2"];
      await service.assignToUsers(mockDiscountId, userIds, mockAdminId);

      expect(userDiscountRepository.save).toHaveBeenCalledWith([
        {
          userId: mockUserId,
          discountId: mockDiscountId,
          assignedBy: mockAdminId,
          usageCount: 0,
        },
        {
          userId: "user-2",
          discountId: mockDiscountId,
          assignedBy: mockAdminId,
          usageCount: 0,
        },
      ]);
    });

    it("should throw BadRequestException for ITEM-targeted discount", async () => {
      discountRepository.findOne.mockResolvedValue(
        mockItemTargetedDiscount as Discount,
      );

      await expect(
        service.assignToUsers(mockDiscountId, [mockUserId], mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("assignToItems", () => {
    it("should assign ITEM-targeted discount to items", async () => {
      discountRepository.findOne.mockResolvedValue(
        mockItemTargetedDiscount as Discount,
      );
      itemDiscountRepository.save.mockResolvedValue([] as any);

      const itemIds = [mockItemId, "item-2"];
      await service.assignToItems(
        mockItemTargetedDiscount.id!,
        itemIds,
        mockAdminId,
      );

      expect(itemDiscountRepository.save).toHaveBeenCalledWith([
        {
          itemId: mockItemId,
          discountId: mockItemTargetedDiscount.id,
          assignedBy: mockAdminId,
        },
        {
          itemId: "item-2",
          discountId: mockItemTargetedDiscount.id,
          assignedBy: mockAdminId,
        },
      ]);
    });

    it("should throw BadRequestException for USER-targeted discount", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);

      await expect(
        service.assignToItems(mockDiscountId, [mockItemId], mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("removeUserAssignment", () => {
    it("should remove user assignment", async () => {
      userDiscountRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeUserAssignment(mockDiscountId, mockUserId);

      expect(userDiscountRepository.delete).toHaveBeenCalledWith({
        discountId: mockDiscountId,
        userId: mockUserId,
      });
    });
  });

  describe("removeItemAssignment", () => {
    it("should remove item assignment", async () => {
      itemDiscountRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeItemAssignment(mockDiscountId, mockItemId);

      expect(itemDiscountRepository.delete).toHaveBeenCalledWith({
        discountId: mockDiscountId,
        itemId: mockItemId,
      });
    });
  });

  describe("getUserDiscounts", () => {
    it("should return active discounts assigned to user", async () => {
      userDiscountRepository.find.mockResolvedValue([
        { ...mockUserDiscount, discount: mockDiscount as Discount },
      ] as UserDiscount[]);

      const result = await service.getUserDiscounts(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockDiscount);
    });

    it("should filter out inactive discounts", async () => {
      const inactiveDiscount = {
        ...mockDiscount,
        isActive: false,
        status: DiscountStatus.INACTIVE,
      };
      userDiscountRepository.find.mockResolvedValue([
        { ...mockUserDiscount, discount: inactiveDiscount as Discount },
      ] as UserDiscount[]);

      const result = await service.getUserDiscounts(mockUserId);

      expect(result).toHaveLength(0);
    });

    it("should filter out expired discounts", async () => {
      const expiredDiscount = {
        ...mockDiscount,
        endDate: new Date(Date.now() - 86400000), // Yesterday
      };
      userDiscountRepository.find.mockResolvedValue([
        { ...mockUserDiscount, discount: expiredDiscount as Discount },
      ] as UserDiscount[]);

      const result = await service.getUserDiscounts(mockUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe("getItemDiscounts", () => {
    it("should return active discounts assigned to item", async () => {
      itemDiscountRepository.find.mockResolvedValue([
        {
          ...mockItemDiscount,
          discount: mockItemTargetedDiscount as Discount,
        },
      ] as ItemDiscount[]);

      const result = await service.getItemDiscounts(mockItemId);

      expect(result).toHaveLength(1);
    });
  });

  describe("getAssignedUsers", () => {
    it("should return users assigned to discount", async () => {
      const mockUser = {
        id: mockUserId,
        fullName: "John Doe",
        email: "john@example.com",
      };
      userDiscountRepository.find.mockResolvedValue([
        {
          ...mockUserDiscount,
          user: mockUser,
          usageCount: 2,
          lastUsedAt: new Date(),
        },
      ] as UserDiscount[]);

      const result = await service.getAssignedUsers(mockDiscountId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockUserId,
        fullName: "John Doe",
        email: "john@example.com",
        usageCount: 2,
        lastUsedAt: expect.any(Date),
        assignedAt: expect.any(Date),
      });
    });
  });

  describe("getAssignedItems", () => {
    it("should return items assigned to discount", async () => {
      const mockItem = {
        id: mockItemId,
        name: { en: "Burger", ar: "برجر" },
      };
      itemDiscountRepository.find.mockResolvedValue([
        { ...mockItemDiscount, item: mockItem },
      ] as ItemDiscount[]);

      const result = await service.getAssignedItems(mockDiscountId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: mockItemId,
        name: { en: "Burger", ar: "برجر" },
        assignedAt: expect.any(Date),
      });
    });
  });

  describe("canUseDiscount", () => {
    beforeEach(() => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
    });

    it("should return canUse: true for valid user discount", async () => {
      userDiscountRepository.findOne.mockResolvedValue(
        mockUserDiscount as UserDiscount,
      );

      const result = await service.canUseDiscount(mockDiscountId, mockUserId);

      expect(result.canUse).toBe(true);
    });

    it("should return canUse: false when discount is inactive", async () => {
      discountRepository.findOne.mockResolvedValue({
        ...mockDiscount,
        isActive: false,
      } as Discount);

      const result = await service.canUseDiscount(mockDiscountId, mockUserId);

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain("not active");
    });

    it("should return canUse: false when discount status is not ACTIVE", async () => {
      discountRepository.findOne.mockResolvedValue({
        ...mockDiscount,
        status: DiscountStatus.SCHEDULED,
      } as Discount);

      const result = await service.canUseDiscount(mockDiscountId, mockUserId);

      expect(result.canUse).toBe(false);
    });

    it("should return canUse: false when discount has expired", async () => {
      discountRepository.findOne.mockResolvedValue({
        ...mockDiscount,
        endDate: new Date(Date.now() - 86400000),
      } as Discount);

      const result = await service.canUseDiscount(mockDiscountId, mockUserId);

      expect(result.canUse).toBe(false);
    });

    it("should return canUse: false when discount start date is in the future", async () => {
      discountRepository.findOne.mockResolvedValue({
        ...mockDiscount,
        startDate: new Date(Date.now() + 86400000),
      } as Discount);

      const result = await service.canUseDiscount(mockDiscountId, mockUserId);

      expect(result.canUse).toBe(false);
    });

    it("should return canUse: false when global usage limit reached", async () => {
      discountRepository.findOne.mockResolvedValue({
        ...mockDiscount,
        maxUsageTotal: 100,
        currentUsageCount: 100,
      } as Discount);

      const result = await service.canUseDiscount(mockDiscountId, mockUserId);

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain("usage limit reached");
    });

    it("should return canUse: false when user is not assigned to discount", async () => {
      userDiscountRepository.findOne.mockResolvedValue(null);

      const result = await service.canUseDiscount(mockDiscountId, mockUserId);

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain("not assigned");
    });

    it("should return canUse: false when user has reached their usage limit", async () => {
      userDiscountRepository.findOne.mockResolvedValue({
        ...mockUserDiscount,
        usageCount: 3,
      } as UserDiscount);

      const result = await service.canUseDiscount(mockDiscountId, mockUserId);

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain("reached their usage limit");
    });

    it("should check item assignment for ITEM-targeted discount", async () => {
      discountRepository.findOne.mockResolvedValue(
        mockItemTargetedDiscount as Discount,
      );
      itemDiscountRepository.findOne.mockResolvedValue(
        mockItemDiscount as ItemDiscount,
      );

      const result = await service.canUseDiscount(
        mockItemTargetedDiscount.id!,
        mockUserId,
        mockItemId,
      );

      expect(result.canUse).toBe(true);
    });

    it("should return canUse: false when item not assigned to ITEM discount", async () => {
      discountRepository.findOne.mockResolvedValue(
        mockItemTargetedDiscount as Discount,
      );
      itemDiscountRepository.findOne.mockResolvedValue(null);

      const result = await service.canUseDiscount(
        mockItemTargetedDiscount.id!,
        mockUserId,
        mockItemId,
      );

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain("not assigned to this item");
    });
  });

  describe("recordUsage", () => {
    beforeEach(() => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
      discountRepository.save.mockResolvedValue(mockDiscount as Discount);
      usageLogRepository.save.mockResolvedValue(
        mockUsageLog as DiscountUsageLog,
      );
    });

    it("should record discount usage", async () => {
      userDiscountRepository.findOne.mockResolvedValue(
        mockUserDiscount as UserDiscount,
      );
      userDiscountRepository.save.mockResolvedValue(
        mockUserDiscount as UserDiscount,
      );

      await service.recordUsage(
        mockDiscountId,
        mockUserId,
        10,
        undefined,
        mockOrderId,
      );

      expect(usageLogRepository.save).toHaveBeenCalledWith({
        discountId: mockDiscountId,
        userId: mockUserId,
        itemId: undefined,
        orderId: mockOrderId,
        discountAmount: 10,
      });
      expect(discountRepository.save).toHaveBeenCalled();
    });

    it("should increment discount currentUsageCount", async () => {
      const freshDiscount = { ...mockDiscount, currentUsageCount: 0 };
      discountRepository.findOne.mockResolvedValue(freshDiscount as Discount);
      userDiscountRepository.findOne.mockResolvedValue(
        mockUserDiscount as UserDiscount,
      );
      userDiscountRepository.save.mockResolvedValue(
        mockUserDiscount as UserDiscount,
      );

      await service.recordUsage(mockDiscountId, mockUserId, 10);

      expect(discountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          currentUsageCount: 1,
        }),
      );
    });

    it("should update userDiscount for USER-targeted discount", async () => {
      userDiscountRepository.findOne.mockResolvedValue({
        ...mockUserDiscount,
        usageCount: 0,
      } as UserDiscount);
      userDiscountRepository.save.mockResolvedValue(
        mockUserDiscount as UserDiscount,
      );

      await service.recordUsage(mockDiscountId, mockUserId, 10);

      expect(userDiscountRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          usageCount: 1,
          lastUsedAt: expect.any(Date),
        }),
      );
    });
  });

  describe("getUsageStats", () => {
    it("should return usage statistics", async () => {
      usageLogRepository.find.mockResolvedValue([
        { ...mockUsageLog, userId: mockUserId, discountAmount: 10 },
        { ...mockUsageLog, userId: mockUserId, discountAmount: 15 },
        { ...mockUsageLog, userId: "user-2", discountAmount: 20 },
      ] as DiscountUsageLog[]);

      const result = await service.getUsageStats(mockDiscountId);

      expect(result).toEqual({
        discountId: mockDiscountId,
        totalUsages: 3,
        uniqueUsers: 2,
        totalAmountSaved: 45,
        averageDiscountAmount: 15,
      });
    });

    it("should handle zero usages", async () => {
      usageLogRepository.find.mockResolvedValue([]);

      const result = await service.getUsageStats(mockDiscountId);

      expect(result).toEqual({
        discountId: mockDiscountId,
        totalUsages: 0,
        uniqueUsers: 0,
        totalAmountSaved: 0,
        averageDiscountAmount: 0,
      });
    });
  });

  describe("calculateDiscountAmount", () => {
    it("should calculate PERCENTAGE discount", () => {
      const percentageDiscount = {
        ...mockDiscount,
        type: DiscountType.PERCENTAGE,
        value: 10,
      };
      const result = service.calculateDiscountAmount(
        percentageDiscount as Discount,
        100,
      );

      expect(result).toBe(10); // 10% of 100
    });

    it("should calculate FIXED_AMOUNT discount", () => {
      const result = service.calculateDiscountAmount(
        mockFixedDiscount as Discount,
        100,
      );

      expect(result).toBe(20);
    });

    it("should calculate BUY_X_GET_Y discount with sufficient quantity", () => {
      const result = service.calculateDiscountAmount(
        mockBuyXGetYDiscount as Discount,
        50, // unit price
        4, // quantity (buy 2 get 1, so 4 items = 2 free items)
      );

      expect(result).toBe(100); // 2 free items * 50
    });

    it("should return 0 for BUY_X_GET_Y with insufficient quantity", () => {
      const result = service.calculateDiscountAmount(
        mockBuyXGetYDiscount as Discount,
        50,
        1, // Not enough to trigger buy 2 get 1
      );

      expect(result).toBe(0);
    });

    it("should return 0 for FREE_ITEM discount", () => {
      const result = service.calculateDiscountAmount(
        mockFreeItemDiscount as Discount,
        100,
      );

      expect(result).toBe(0);
    });

    it("should return 0 for unknown discount type", () => {
      const unknownDiscount = {
        ...mockDiscount,
        type: "UNKNOWN" as DiscountType,
      };

      const result = service.calculateDiscountAmount(
        unknownDiscount as Discount,
        100,
      );

      expect(result).toBe(0);
    });

    it("should handle percentage with decimal values", () => {
      const percentageDiscount = {
        ...mockDiscount,
        value: 15.5,
      };

      const result = service.calculateDiscountAmount(
        percentageDiscount as Discount,
        200,
      );

      expect(result).toBe(31); // 15.5% of 200
    });

    it("should handle BUY_X_GET_Y with multiple sets", () => {
      const result = service.calculateDiscountAmount(
        mockBuyXGetYDiscount as Discount,
        30, // unit price
        6, // quantity (3 sets of buy 2 = 3 free items)
      );

      expect(result).toBe(90); // 3 free items * 30
    });
  });

  describe("activateDiscount", () => {
    it("should activate a discount", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
      discountRepository.save.mockImplementation((discount) =>
        Promise.resolve(discount as Discount),
      );

      const result = await service.activateDiscount(
        mockDiscountId,
        mockAdminId,
      );

      expect(result.isActive).toBe(true);
      expect(result.status).toBe(DiscountStatus.ACTIVE);
      expect(result.updatedBy).toBe(mockAdminId);
    });
  });

  describe("deactivateDiscount", () => {
    it("should deactivate a discount", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
      discountRepository.save.mockImplementation((discount) =>
        Promise.resolve(discount as Discount),
      );

      const result = await service.deactivateDiscount(
        mockDiscountId,
        mockAdminId,
      );

      expect(result.isActive).toBe(false);
      expect(result.status).toBe(DiscountStatus.INACTIVE);
      expect(result.updatedBy).toBe(mockAdminId);
    });
  });

  describe("expireDiscount", () => {
    it("should expire a discount", async () => {
      discountRepository.findOne.mockResolvedValue(mockDiscount as Discount);
      discountRepository.save.mockImplementation((discount) =>
        Promise.resolve(discount as Discount),
      );

      const result = await service.expireDiscount(mockDiscountId, mockAdminId);

      expect(result.isActive).toBe(false);
      expect(result.status).toBe(DiscountStatus.EXPIRED);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.updatedBy).toBe(mockAdminId);
    });
  });
});
