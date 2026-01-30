import { Test, type TestingModule } from "@nestjs/testing";
import { OrderStatus } from "../../common/enums/OrderStatus";
import { OrderType } from "../../common/enums/OrderType";
import { CartService } from "../cart/cart.service";
import { CheckoutService } from "./checkout.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

describe("OrdersController", () => {
  let controller: OrdersController;
  let ordersService: jest.Mocked<OrdersService>;
  let checkoutService: jest.Mocked<CheckoutService>;
  let cartService: jest.Mocked<CartService>;

  const mockUserId = "user-123";
  const mockOrderId = "order-123";

  const mockOrder = {
    id: mockOrderId,
    orderNumber: "WLY-240101-001",
    userId: mockUserId,
    branchId: "branch-123",
    orderType: OrderType.DELIVERY,
    status: OrderStatus.PENDING,
    subtotal: 100,
    discountAmount: 10,
    deliveryFee: 20,
    total: 110,
    items: [
      {
        id: "item-123",
        itemType: "ITEM",
        originalItemId: "original-item-123",
        quantity: 2,
        selectedVariant: null,
        customizations: null,
        extras: null,
        specialInstructions: null,
      },
    ],
    statusLogs: [
      {
        newStatus: OrderStatus.PENDING,
        occurredAt: new Date(),
        notes: "Order created",
      },
    ],
    createdAt: new Date(),
    confirmedAt: null,
    preparingAt: null,
    readyAt: null,
    outForDeliveryAt: null,
    completedAt: null,
    cancelledAt: null,
  };

  const mockCart = {
    id: "cart-123",
    userId: mockUserId,
    items: [],
  };

  const mockRequest = {
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
    headers: { "user-agent": "test-agent" },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            findByUser: jest.fn(),
            findOne: jest.fn(),
            cancelOrder: jest.fn(),
          },
        },
        {
          provide: CheckoutService,
          useValue: {
            processCheckout: jest.fn(),
            getCheckoutSummary: jest.fn(),
          },
        },
        {
          provide: CartService,
          useValue: {
            addItem: jest.fn(),
            getCart: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    ordersService = module.get(OrdersService);
    checkoutService = module.get(CheckoutService);
    cartService = module.get(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkout", () => {
    it("should process checkout and return order", async () => {
      const checkoutDto = {
        idempotencyKey: "idem-123",
        paymentType: "CASH" as any,
      };
      const checkoutResult = {
        order: mockOrder as any,
        payment: { id: "payment-123", status: "PENDING" },
      };
      checkoutService.processCheckout.mockResolvedValue(checkoutResult);

      const result = await controller.checkout(
        mockUserId,
        checkoutDto,
        mockRequest as any,
      );

      expect(checkoutService.processCheckout).toHaveBeenCalledWith(
        mockUserId,
        checkoutDto,
        "127.0.0.1",
        "test-agent",
      );
      expect(result.message).toBe("Order created successfully");
      expect(result.data.payment).toEqual(checkoutResult.payment);
    });
  });

  describe("getCheckoutSummary", () => {
    it("should return checkout summary", async () => {
      const summary = {
        cart: mockCart,
        canCheckout: true,
        validationErrors: [],
        estimatedTime: 30,
      };
      checkoutService.getCheckoutSummary.mockResolvedValue(summary as any);

      const result = await controller.getCheckoutSummary(mockUserId);

      expect(checkoutService.getCheckoutSummary).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result.message).toBe("Checkout summary retrieved");
      expect(result.data).toEqual(summary);
    });
  });

  describe("findAll", () => {
    it("should return paginated orders", async () => {
      const filterDto = { page: 1, limit: 10 };
      ordersService.findByUser.mockResolvedValue({
        orders: [mockOrder as any],
        total: 1,
      });

      const result = await controller.findAll(mockUserId, filterDto);

      expect(ordersService.findByUser).toHaveBeenCalledWith(
        mockUserId,
        filterDto,
      );
      expect(result.message).toBe("Orders retrieved successfully");
    });

    it("should use default pagination values", async () => {
      const filterDto = {};
      ordersService.findByUser.mockResolvedValue({
        orders: [],
        total: 0,
      });

      const result = await controller.findAll(mockUserId, filterDto);

      expect(result.pagination?.page).toBe(1);
      expect(result.pagination?.limit).toBe(10);
    });
  });

  describe("findOne", () => {
    it("should return order by id", async () => {
      ordersService.findOne.mockResolvedValue(mockOrder as any);

      const result = await controller.findOne(mockUserId, mockOrderId);

      expect(ordersService.findOne).toHaveBeenCalledWith(mockOrderId);
      expect(result.message).toBe("Order retrieved successfully");
    });

    it("should throw error when order belongs to different user", async () => {
      const otherUserOrder = { ...mockOrder, userId: "other-user" };
      ordersService.findOne.mockResolvedValue(otherUserOrder as any);

      await expect(controller.findOne(mockUserId, mockOrderId)).rejects.toThrow(
        "Order not found",
      );
    });
  });

  describe("getOrderStatus", () => {
    it("should return order status with timestamps", async () => {
      ordersService.findOne.mockResolvedValue(mockOrder as any);

      const result = await controller.getOrderStatus(mockUserId, mockOrderId);

      expect(ordersService.findOne).toHaveBeenCalledWith(mockOrderId);
      expect(result.message).toBe("Order status retrieved successfully");
      expect(result.data.status).toBe(OrderStatus.PENDING);
      expect(result.data.orderNumber).toBe(mockOrder.orderNumber);
      expect(result.data.timestamps).toBeDefined();
    });

    it("should throw error when order belongs to different user", async () => {
      const otherUserOrder = { ...mockOrder, userId: "other-user" };
      ordersService.findOne.mockResolvedValue(otherUserOrder as any);

      await expect(
        controller.getOrderStatus(mockUserId, mockOrderId),
      ).rejects.toThrow("Order not found");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel order", async () => {
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
      ordersService.cancelOrder.mockResolvedValue(cancelledOrder as any);

      const dto = { reason: "Changed my mind" };
      const result = await controller.cancelOrder(
        mockUserId,
        mockOrderId,
        dto,
        mockRequest as any,
      );

      expect(ordersService.cancelOrder).toHaveBeenCalledWith(
        mockOrderId,
        mockUserId,
        "Changed my mind",
        false,
        "127.0.0.1",
      );
      expect(result.message).toBe("Order cancelled successfully");
    });
  });

  describe("reorder", () => {
    it("should add order items to cart", async () => {
      ordersService.findOne.mockResolvedValue(mockOrder as any);
      cartService.addItem.mockResolvedValue(mockCart as any);
      cartService.getCart.mockResolvedValue(mockCart as any);

      const result = await controller.reorder(mockUserId, mockOrderId);

      expect(ordersService.findOne).toHaveBeenCalledWith(mockOrderId);
      expect(cartService.addItem).toHaveBeenCalled();
      expect(cartService.getCart).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("Items added to cart from previous order");
    });

    it("should throw error when order belongs to different user", async () => {
      const otherUserOrder = { ...mockOrder, userId: "other-user" };
      ordersService.findOne.mockResolvedValue(otherUserOrder as any);

      await expect(controller.reorder(mockUserId, mockOrderId)).rejects.toThrow(
        "Order not found",
      );
    });

    it("should handle order with no items", async () => {
      const orderWithNoItems = { ...mockOrder, items: [] };
      ordersService.findOne.mockResolvedValue(orderWithNoItems as any);
      cartService.getCart.mockResolvedValue(mockCart as any);

      const result = await controller.reorder(mockUserId, mockOrderId);

      expect(cartService.addItem).not.toHaveBeenCalled();
      expect(result.message).toBe("Items added to cart from previous order");
    });

    it("should handle bundle items in reorder", async () => {
      const orderWithBundle = {
        ...mockOrder,
        items: [
          {
            id: "bundle-item-123",
            itemType: "BUNDLE",
            originalItemId: "original-bundle-123",
            quantity: 1,
            selectedVariant: null,
            customizations: null,
            extras: null,
            specialInstructions: null,
          },
        ],
      };
      ordersService.findOne.mockResolvedValue(orderWithBundle as any);
      cartService.addItem.mockResolvedValue(mockCart as any);
      cartService.getCart.mockResolvedValue(mockCart as any);

      await controller.reorder(mockUserId, mockOrderId);

      expect(cartService.addItem).toHaveBeenCalledWith(mockUserId, {
        itemId: undefined,
        bundleId: "original-bundle-123",
        quantity: 1,
        selectedVariant: null,
        customizations: null,
        extras: null,
        specialInstructions: null,
      });
    });
  });
});
