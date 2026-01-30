import { Test, type TestingModule } from "@nestjs/testing";
import { OrdersAdminController } from "./orders-admin.controller";
import { OrdersService } from "./orders.service";

describe("OrdersAdminController", () => {
  let controller: OrdersAdminController;
  let ordersService: jest.Mocked<OrdersService>;

  const mockUserId = "admin-123";
  const mockOrderId = "order-123";
  const mockBranchId = "branch-123";

  const mockOrder = {
    id: mockOrderId,
    orderNumber: "ORD-001",
    userId: "user-123",
    branchId: mockBranchId,
    status: "pending",
    total: 100,
    items: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersAdminController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            findAll: jest.fn(),
            getOrderStats: jest.fn(),
            findOne: jest.fn(),
            updateStatus: jest.fn(),
            cancelOrder: jest.fn(),
            confirmOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersAdminController>(OrdersAdminController);
    ordersService = module.get(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated orders", async () => {
      const filterDto = { page: 1, limit: 10 };
      ordersService.findAll.mockResolvedValue({
        orders: [mockOrder],
        total: 1,
      } as any);

      const result = await controller.findAll(filterDto);

      expect(ordersService.findAll).toHaveBeenCalledWith(filterDto);
      expect(result.message).toBe("Orders retrieved successfully");
    });

    it("should use default pagination values", async () => {
      ordersService.findAll.mockResolvedValue({
        orders: [],
        total: 0,
      } as any);

      const result = await controller.findAll({});

      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.limit).toBe(10);
    });
  });

  describe("getStats", () => {
    it("should return order statistics", async () => {
      const stats = {
        totalOrders: 100,
        pendingOrders: 10,
        completedOrders: 85,
        cancelledOrders: 5,
        totalRevenue: 10000,
      };
      ordersService.getOrderStats.mockResolvedValue(stats as any);

      const result = await controller.getStats();

      expect(ordersService.getOrderStats).toHaveBeenCalledWith(undefined);
      expect(result.message).toBe("Order statistics retrieved");
      expect(result.data).toEqual(stats);
    });

    it("should return branch-specific statistics", async () => {
      const stats = { totalOrders: 50, totalRevenue: 5000 };
      ordersService.getOrderStats.mockResolvedValue(stats as any);

      const result = await controller.getStats(mockBranchId);

      expect(ordersService.getOrderStats).toHaveBeenCalledWith(mockBranchId);
    });
  });

  describe("findByBranch", () => {
    it("should return orders for a branch", async () => {
      const filterDto = { page: 1, limit: 10 };
      ordersService.findAll.mockResolvedValue({
        orders: [mockOrder],
        total: 1,
      } as any);

      const result = await controller.findByBranch(mockBranchId, filterDto);

      expect(ordersService.findAll).toHaveBeenCalledWith({
        ...filterDto,
        branchId: mockBranchId,
      });
      expect(result.message).toBe("Branch orders retrieved successfully");
    });
  });

  describe("findOne", () => {
    it("should return order by id", async () => {
      ordersService.findOne.mockResolvedValue(mockOrder as any);

      const result = await controller.findOne(mockOrderId);

      expect(ordersService.findOne).toHaveBeenCalledWith(mockOrderId);
      expect(result.message).toBe("Order retrieved successfully");
    });
  });

  describe("updateStatus", () => {
    it("should update order status", async () => {
      const updateDto = { status: "preparing", notes: "Started cooking" } as any;
      const updatedOrder = { ...mockOrder, status: "preparing" };
      ordersService.updateStatus.mockResolvedValue(updatedOrder as any);

      const mockReq = { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } };
      const result = await controller.updateStatus(
        mockUserId,
        mockOrderId,
        updateDto,
        mockReq as any,
      );

      expect(ordersService.updateStatus).toHaveBeenCalledWith(
        mockOrderId,
        "preparing",
        mockUserId,
        "Started cooking",
        "127.0.0.1",
      );
      expect(result.message).toBe("Order status updated successfully");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel an order", async () => {
      const cancelDto = { reason: "Customer requested" } as any;
      const cancelledOrder = { ...mockOrder, status: "cancelled" };
      ordersService.cancelOrder.mockResolvedValue(cancelledOrder as any);

      const mockReq = { ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" } };
      const result = await controller.cancelOrder(
        mockUserId,
        mockOrderId,
        cancelDto,
        mockReq as any,
      );

      expect(ordersService.cancelOrder).toHaveBeenCalledWith(
        mockOrderId,
        mockUserId,
        "Customer requested",
        true,
        "127.0.0.1",
      );
      expect(result.message).toBe("Order cancelled successfully");
    });
  });

  describe("confirmOrder", () => {
    it("should confirm an order", async () => {
      const confirmedOrder = { ...mockOrder, status: "confirmed" };
      ordersService.confirmOrder.mockResolvedValue(confirmedOrder as any);

      const result = await controller.confirmOrder(mockUserId, mockOrderId);

      expect(ordersService.confirmOrder).toHaveBeenCalledWith(
        mockOrderId,
        mockUserId,
      );
      expect(result.message).toBe("Order confirmed successfully");
    });
  });
});
