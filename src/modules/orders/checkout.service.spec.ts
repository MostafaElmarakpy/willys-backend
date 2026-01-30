import { BadRequestException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { OrderType } from "../../common/enums/OrderType";
import { PaymentStatus } from "../../common/enums/PaymentStatus";
import { PaymentType } from "../../common/enums/PaymentType";
import { Cart } from "../../database/entities/cart.entity";
import { Order } from "../../database/entities/order.entity";
import { User } from "../../database/entities/user.entity";
import { CartService } from "../cart/cart.service";
import { DiscountsService } from "../discounts/discounts.service";
import { PaymentsService } from "../payments/payments.service";
import { CheckoutService } from "./checkout.service";
import { OrdersService } from "./orders.service";

describe("CheckoutService", () => {
  let service: CheckoutService;
  let cartService: jest.Mocked<CartService>;
  let ordersService: jest.Mocked<OrdersService>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let orderRepository: any;
  let userRepository: any;

  const mockUserId = "user-123";

  const mockUser = {
    id: mockUserId,
    fullName: "Test User",
    email: "test@example.com",
    phoneNumber: "1234567890",
    phoneNumberCountryCode: "+20",
  };

  const mockCart = {
    id: "cart-123",
    userId: mockUserId,
    orderType: OrderType.DELIVERY,
    branchId: "branch-123",
    items: [{ itemId: "item-1", quantity: 2 }],
    appliedDiscounts: [],
    subtotal: 100,
    total: 110,
  };

  const mockOrder = {
    id: "order-123",
    orderNumber: "ORD-001",
    userId: mockUserId,
    total: 110,
    paymentId: "payment-123",
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Cart),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: CartService,
          useValue: {
            validateCart: jest.fn(),
            getCart: jest.fn(),
            clearCart: jest.fn(),
          },
        },
        {
          provide: OrdersService,
          useValue: {
            findOne: jest.fn(),
            createFromCart: jest.fn(),
            confirmOrder: jest.fn(),
            cancelOrder: jest.fn(),
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            createPayment: jest.fn(),
            processCardPayment: jest.fn(),
            processCashPayment: jest.fn(),
          },
        },
        {
          provide: DiscountsService,
          useValue: {
            recordUsage: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
    cartService = module.get(CartService);
    ordersService = module.get(OrdersService);
    paymentsService = module.get(PaymentsService);
    orderRepository = module.get(getRepositoryToken(Order));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCheckoutSummary", () => {
    it("should return checkout summary for delivery order", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = await service.getCheckoutSummary(mockUserId);

      expect(result.cart).toEqual(mockCart);
      expect(result.canCheckout).toBe(true);
      expect(result.validationErrors).toEqual([]);
      expect(result.estimatedTime).toBe(32); // 30 base + 1*2
    });

    it("should return checkout summary for pickup order", async () => {
      const pickupCart = { ...mockCart, orderType: OrderType.PICKUP };
      cartService.getCart.mockResolvedValue(pickupCart as any);
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = await service.getCheckoutSummary(mockUserId);

      expect(result.estimatedTime).toBe(17); // 15 base + 1*2
    });

    it("should return validation errors when cart is invalid", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      cartService.validateCart.mockResolvedValue({
        isValid: false,
        errors: [{ error: "Item out of stock" }],
        warnings: [],
      });

      const result = await service.getCheckoutSummary(mockUserId);

      expect(result.canCheckout).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
    });
  });

  describe("handlePaymentConfirmation", () => {
    it("should confirm order on successful payment", async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      await service.handlePaymentConfirmation(
        "payment-123",
        PaymentStatus.SUCCESS,
      );

      expect(ordersService.confirmOrder).toHaveBeenCalledWith(mockOrder.id);
    });

    it("should cancel order on failed payment", async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      await service.handlePaymentConfirmation(
        "payment-123",
        PaymentStatus.FAILED,
      );

      expect(ordersService.cancelOrder).toHaveBeenCalledWith(
        mockOrder.id,
        mockOrder.userId,
        "Payment failed",
        true,
      );
    });

    it("should do nothing when order not found", async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await service.handlePaymentConfirmation(
        "unknown-payment",
        PaymentStatus.SUCCESS,
      );

      expect(ordersService.confirmOrder).not.toHaveBeenCalled();
      expect(ordersService.cancelOrder).not.toHaveBeenCalled();
    });
  });

  describe("processCheckout", () => {
    const checkoutDto = {
      idempotencyKey: "idem-key-123",
      paymentType: PaymentType.CASH,
    };

    it("should throw BadRequestException when cart validation fails", async () => {
      cartService.validateCart.mockResolvedValue({
        isValid: false,
        errors: [{ error: "Item unavailable" }],
        warnings: [],
      });

      await expect(
        service.processCheckout(mockUserId, checkoutDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when cart is empty", async () => {
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue({
        ...mockCart,
        items: [],
      } as any);

      await expect(
        service.processCheckout(mockUserId, {
          ...checkoutDto,
          idempotencyKey: "new-key-1",
        }),
      ).rejects.toThrow("Cart is empty");
    });

    it("should throw BadRequestException when order type not selected", async () => {
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue({
        ...mockCart,
        orderType: null,
      } as any);

      await expect(
        service.processCheckout(mockUserId, {
          ...checkoutDto,
          idempotencyKey: "new-key-2",
        }),
      ).rejects.toThrow("Order type not selected");
    });

    it("should throw BadRequestException when branch not selected", async () => {
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue({
        ...mockCart,
        branchId: null,
      } as any);

      await expect(
        service.processCheckout(mockUserId, {
          ...checkoutDto,
          idempotencyKey: "new-key-3",
        }),
      ).rejects.toThrow("Branch not selected");
    });

    it("should throw BadRequestException when user not found", async () => {
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue(mockCart as any);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processCheckout(mockUserId, {
          ...checkoutDto,
          idempotencyKey: "new-key-4",
        }),
      ).rejects.toThrow("User not found");
    });

    it("should throw BadRequestException when user phone is missing", async () => {
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue(mockCart as any);
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        phoneNumber: null,
      });

      await expect(
        service.processCheckout(mockUserId, {
          ...checkoutDto,
          idempotencyKey: "new-key-5",
        }),
      ).rejects.toThrow("User phone number is required for checkout");
    });

    it("should process cash checkout successfully", async () => {
      const uniqueKey = `cash-checkout-${Date.now()}`;
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue(mockCart as any);
      userRepository.findOne.mockResolvedValue(mockUser);
      ordersService.createFromCart.mockResolvedValue(mockOrder as any);
      paymentsService.createPayment.mockResolvedValue({
        id: "payment-123",
        status: "PENDING",
      } as any);
      paymentsService.processCashPayment.mockResolvedValue({
        status: "CONFIRMED",
        cashReferenceNumber: "CASH-123",
      } as any);
      ordersService.findOne.mockResolvedValue(mockOrder as any);
      cartService.clearCart.mockResolvedValue(undefined as any);

      const result = await service.processCheckout(mockUserId, {
        idempotencyKey: uniqueKey,
        paymentType: PaymentType.CASH,
      });

      expect(result.order).toBeDefined();
      expect(result.payment.id).toBe("payment-123");
      expect(cartService.clearCart).toHaveBeenCalledWith(mockUserId);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("should process card checkout successfully", async () => {
      const uniqueKey = `card-checkout-${Date.now()}`;
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue(mockCart as any);
      userRepository.findOne.mockResolvedValue(mockUser);
      ordersService.createFromCart.mockResolvedValue(mockOrder as any);
      paymentsService.createPayment.mockResolvedValue({
        id: "payment-123",
        status: "PENDING",
      } as any);
      paymentsService.processCardPayment.mockResolvedValue({
        status: "PENDING",
        iframeUrl: "https://payment.example.com/iframe",
      } as any);
      ordersService.findOne.mockResolvedValue(mockOrder as any);
      cartService.clearCart.mockResolvedValue(undefined as any);

      const result = await service.processCheckout(mockUserId, {
        idempotencyKey: uniqueKey,
        paymentType: PaymentType.CARD,
      });

      expect(result.order).toBeDefined();
      expect(result.payment.iframeUrl).toBe(
        "https://payment.example.com/iframe",
      );
      expect(paymentsService.processCardPayment).toHaveBeenCalled();
    });

    it("should return existing order for duplicate idempotency key", async () => {
      const duplicateKey = `duplicate-key-${Date.now()}`;

      // First checkout
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue(mockCart as any);
      userRepository.findOne.mockResolvedValue(mockUser);
      ordersService.createFromCart.mockResolvedValue(mockOrder as any);
      paymentsService.createPayment.mockResolvedValue({
        id: "payment-123",
        status: "PENDING",
      } as any);
      paymentsService.processCashPayment.mockResolvedValue({
        status: "CONFIRMED",
      } as any);
      ordersService.findOne.mockResolvedValue(mockOrder as any);
      cartService.clearCart.mockResolvedValue(undefined as any);

      await service.processCheckout(mockUserId, {
        idempotencyKey: duplicateKey,
        paymentType: PaymentType.CASH,
      });

      // Reset mocks
      jest.clearAllMocks();

      // Second checkout with same key
      ordersService.findOne.mockResolvedValue(mockOrder as any);

      const result = await service.processCheckout(mockUserId, {
        idempotencyKey: duplicateKey,
        paymentType: PaymentType.CASH,
      });

      expect(result.payment.status).toBe("EXISTING");
      expect(cartService.validateCart).not.toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      const uniqueKey = `error-checkout-${Date.now()}`;
      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue(mockCart as any);
      userRepository.findOne.mockResolvedValue(mockUser);
      ordersService.createFromCart.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        service.processCheckout(mockUserId, {
          idempotencyKey: uniqueKey,
          paymentType: PaymentType.CASH,
        }),
      ).rejects.toThrow("Database error");

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it("should record discount usage when discounts are applied", async () => {
      const uniqueKey = `discount-checkout-${Date.now()}`;
      const cartWithDiscount = {
        ...mockCart,
        appliedDiscounts: [
          { discountId: "discount-123", code: "SAVE10", amount: 10 },
        ],
      };

      // Mock the discount query to return a valid discount
      const mockDiscount = {
        id: "discount-123",
        code: "SAVE10",
        isActive: true,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
        maxUsageTotal: 100,
        currentUsageCount: 0,
        targetType: "ALL",
      };
      mockQueryRunner.manager.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockDiscount),
      });

      cartService.validateCart.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
      });
      cartService.getCart.mockResolvedValue(cartWithDiscount as any);
      userRepository.findOne.mockResolvedValue(mockUser);
      ordersService.createFromCart.mockResolvedValue(mockOrder as any);
      paymentsService.createPayment.mockResolvedValue({
        id: "payment-123",
        status: "PENDING",
      } as any);
      paymentsService.processCashPayment.mockResolvedValue({
        status: "CONFIRMED",
      } as any);
      ordersService.findOne.mockResolvedValue(mockOrder as any);
      cartService.clearCart.mockResolvedValue(undefined as any);

      await service.processCheckout(mockUserId, {
        idempotencyKey: uniqueKey,
        paymentType: PaymentType.CASH,
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
