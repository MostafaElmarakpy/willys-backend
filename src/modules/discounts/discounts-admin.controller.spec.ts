import { Test, type TestingModule } from "@nestjs/testing";
import { DiscountsService } from "./discounts.service";
import { DiscountsAdminController } from "./discounts-admin.controller";

describe("DiscountsAdminController", () => {
  let controller: DiscountsAdminController;
  let discountsService: jest.Mocked<DiscountsService>;

  const mockUserId = "admin-123";
  const mockDiscountId = "discount-123";
  const mockItemId = "item-123";
  const mockUserTargetId = "user-target-123";

  const mockDiscount = {
    id: mockDiscountId,
    code: "SAVE10",
    type: "percentage",
    value: 10,
    isActive: true,
    usageLimit: 100,
    usageCount: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscountsAdminController],
      providers: [
        {
          provide: DiscountsService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            duplicate: jest.fn(),
            assignToUsers: jest.fn(),
            assignToItems: jest.fn(),
            removeUserAssignment: jest.fn(),
            removeItemAssignment: jest.fn(),
            getAssignedUsers: jest.fn(),
            getAssignedItems: jest.fn(),
            getUsageStats: jest.fn(),
            activateDiscount: jest.fn(),
            deactivateDiscount: jest.fn(),
            expireDiscount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DiscountsAdminController>(DiscountsAdminController);
    discountsService = module.get(DiscountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated discounts", async () => {
      const paginatedResult = {
        discounts: [mockDiscount],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        activeCount: 1,
        inactiveCount: 0,
        percentageDiscountsCount: 1,
      };
      discountsService.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(discountsService.findAll).toHaveBeenCalled();
      expect(result.message).toBe("Discounts retrieved successfully");
    });
  });

  describe("create", () => {
    it("should create a discount", async () => {
      const createDto = {
        code: "NEW10",
        type: "percentage",
        value: 10,
      } as any;
      discountsService.create.mockResolvedValue(mockDiscount as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.create(createDto, mockReq);

      expect(discountsService.create).toHaveBeenCalledWith(
        createDto,
        mockUserId,
      );
      expect(result.message).toBe("Discount created successfully");
    });
  });

  describe("findOne", () => {
    it("should return discount by id", async () => {
      discountsService.findOne.mockResolvedValue(mockDiscount as any);

      const result = await controller.findOne(mockDiscountId);

      expect(discountsService.findOne).toHaveBeenCalledWith(mockDiscountId);
      expect(result.message).toBe("Discount retrieved successfully");
    });
  });

  describe("update", () => {
    it("should update a discount", async () => {
      const updateDto = { value: 15 } as any;
      discountsService.update.mockResolvedValue({
        ...mockDiscount,
        value: 15,
      } as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.update(
        mockDiscountId,
        updateDto,
        mockReq,
      );

      expect(discountsService.update).toHaveBeenCalledWith(
        mockDiscountId,
        updateDto,
        mockUserId,
      );
      expect(result.message).toBe("Discount updated successfully");
    });
  });

  describe("remove", () => {
    it("should delete a discount", async () => {
      discountsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockDiscountId);

      expect(discountsService.remove).toHaveBeenCalledWith(mockDiscountId);
      expect(result.message).toBe("Discount deleted successfully");
    });
  });

  describe("duplicate", () => {
    it("should duplicate a discount", async () => {
      const duplicatedDiscount = { ...mockDiscount, id: "discount-copy" };
      discountsService.duplicate.mockResolvedValue(duplicatedDiscount as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.duplicate(mockDiscountId, mockReq);

      expect(discountsService.duplicate).toHaveBeenCalledWith(
        mockDiscountId,
        mockUserId,
      );
      expect(result.message).toBe("Discount duplicated successfully");
    });
  });

  describe("assignToUsers", () => {
    it("should assign discount to users", async () => {
      discountsService.assignToUsers.mockResolvedValue(undefined);

      const mockReq = { user: { id: mockUserId } };
      const assignDto = { userIds: [mockUserTargetId] };
      const result = await controller.assignToUsers(
        mockDiscountId,
        assignDto,
        mockReq,
      );

      expect(discountsService.assignToUsers).toHaveBeenCalledWith(
        mockDiscountId,
        [mockUserTargetId],
        mockUserId,
      );
      expect(result.message).toBe("Discount assigned to users successfully");
    });
  });

  describe("assignToItems", () => {
    it("should assign discount to items", async () => {
      discountsService.assignToItems.mockResolvedValue(undefined);

      const mockReq = { user: { id: mockUserId } };
      const assignDto = { itemIds: [mockItemId] };
      const result = await controller.assignToItems(
        mockDiscountId,
        assignDto,
        mockReq,
      );

      expect(discountsService.assignToItems).toHaveBeenCalledWith(
        mockDiscountId,
        [mockItemId],
        mockUserId,
      );
      expect(result.message).toBe("Discount assigned to items successfully");
    });
  });

  describe("removeUserAssignment", () => {
    it("should remove user assignment", async () => {
      discountsService.removeUserAssignment.mockResolvedValue(undefined);

      const result = await controller.removeUserAssignment(
        mockDiscountId,
        mockUserTargetId,
      );

      expect(discountsService.removeUserAssignment).toHaveBeenCalledWith(
        mockDiscountId,
        mockUserTargetId,
      );
      expect(result.message).toBe("User assignment removed successfully");
    });
  });

  describe("removeItemAssignment", () => {
    it("should remove item assignment", async () => {
      discountsService.removeItemAssignment.mockResolvedValue(undefined);

      const result = await controller.removeItemAssignment(
        mockDiscountId,
        mockItemId,
      );

      expect(discountsService.removeItemAssignment).toHaveBeenCalledWith(
        mockDiscountId,
        mockItemId,
      );
      expect(result.message).toBe("Item assignment removed successfully");
    });
  });

  describe("getAssignedUsers", () => {
    it("should return assigned users", async () => {
      const users = [{ id: mockUserTargetId, email: "user@test.com" }];
      discountsService.getAssignedUsers.mockResolvedValue(users as any);

      const result = await controller.getAssignedUsers(mockDiscountId);

      expect(discountsService.getAssignedUsers).toHaveBeenCalledWith(
        mockDiscountId,
      );
      expect(result.message).toBe("Assigned users retrieved successfully");
    });
  });

  describe("getAssignedItems", () => {
    it("should return assigned items", async () => {
      const items = [{ id: mockItemId, name: "Item 1" }];
      discountsService.getAssignedItems.mockResolvedValue(items as any);

      const result = await controller.getAssignedItems(mockDiscountId);

      expect(discountsService.getAssignedItems).toHaveBeenCalledWith(
        mockDiscountId,
      );
      expect(result.message).toBe("Assigned items retrieved successfully");
    });
  });

  describe("getUsageStats", () => {
    it("should return usage stats", async () => {
      const stats = { totalUsage: 10, uniqueUsers: 5, totalSavings: 100 };
      discountsService.getUsageStats.mockResolvedValue(stats as any);

      const result = await controller.getUsageStats(mockDiscountId);

      expect(discountsService.getUsageStats).toHaveBeenCalledWith(
        mockDiscountId,
      );
      expect(result.message).toBe("Usage stats retrieved successfully");
    });
  });

  describe("activate", () => {
    it("should activate a discount", async () => {
      const activatedDiscount = { ...mockDiscount, isActive: true };
      discountsService.activateDiscount.mockResolvedValue(
        activatedDiscount as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.activate(mockDiscountId, mockReq);

      expect(discountsService.activateDiscount).toHaveBeenCalledWith(
        mockDiscountId,
        mockUserId,
      );
      expect(result.message).toBe("Discount activated successfully");
    });
  });

  describe("deactivate", () => {
    it("should deactivate a discount", async () => {
      const deactivatedDiscount = { ...mockDiscount, isActive: false };
      discountsService.deactivateDiscount.mockResolvedValue(
        deactivatedDiscount as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.deactivate(mockDiscountId, mockReq);

      expect(discountsService.deactivateDiscount).toHaveBeenCalledWith(
        mockDiscountId,
        mockUserId,
      );
      expect(result.message).toBe("Discount deactivated successfully");
    });
  });

  describe("expire", () => {
    it("should expire a discount", async () => {
      const expiredDiscount = { ...mockDiscount, isActive: false };
      discountsService.expireDiscount.mockResolvedValue(expiredDiscount as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.expire(mockDiscountId, mockReq);

      expect(discountsService.expireDiscount).toHaveBeenCalledWith(
        mockDiscountId,
        mockUserId,
      );
      expect(result.message).toBe("Discount expired successfully");
    });
  });
});
