import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { OrderStatus } from "../../common/enums/OrderStatus";
import { OrderType } from "../../common/enums/OrderType";
import { Order } from "../../database/entities/order.entity";
import { OrderItem } from "../../database/entities/order-item.entity";
import { OrderStatusLog } from "../../database/entities/order-status-log.entity";
import { UserAddress } from "../../database/entities/user-address.entity";
import { OrdersService } from "./orders.service";

describe("OrdersService", () => {
  let service: OrdersService;
  let orderRepository: any;
  let orderItemRepository: any;
  let statusLogRepository: any;
  let addressRepository: any;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUserId = "user-123";

  const mockOrder: Partial<Order> = {
    id: "order-123",
    orderNumber: "WLY-240101-001",
    userId: mockUserId,
    branchId: "branch-123",
    orderType: OrderType.DELIVERY,
    status: OrderStatus.PENDING,
    subtotal: 100,
    total: 110,
    items: [],
    statusLogs: [],
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn().mockImplementation((data) => ({ ...data, id: "new-id" })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    },
  };

  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getOne: jest.fn(),
      getCount: jest.fn().mockResolvedValue(0),
      clone: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ sum: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(OrderStatusLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserAddress),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    orderItemRepository = module.get(getRepositoryToken(OrderItem));
    statusLogRepository = module.get(getRepositoryToken(OrderStatusLog));
    addressRepository = module.get(getRepositoryToken(UserAddress));
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateOrderNumber", () => {
    it("should generate a valid order number", async () => {
      const orderNumber = await service.generateOrderNumber();

      expect(orderNumber).toMatch(/^WLY-\d{10}-\d{3}$/);
    });
  });

  describe("findOne", () => {
    it("should return an order by id", async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne("order-123");

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: "order-123", deletedAt: expect.anything() },
        relations: ["items", "statusLogs", "branch", "user"],
        order: { statusLogs: { occurredAt: "ASC" } },
      });
    });

    it("should throw NotFoundException when order not found", async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("unknown-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByOrderNumber", () => {
    it("should return an order by order number", async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findByOrderNumber("WLY-240101-001");

      expect(result).toEqual(mockOrder);
    });

    it("should throw NotFoundException when order not found", async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findByOrderNumber("UNKNOWN")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByUser", () => {
    it("should return paginated orders for a user", async () => {
      const orders = [mockOrder];
      queryBuilder.getManyAndCount.mockResolvedValue([orders, 1]);

      const result = await service.findByUser(mockUserId, {});

      expect(result.orders).toEqual(orders);
      expect(result.total).toBe(1);
    });

    it("should filter by status", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByUser(mockUserId, {
        status: OrderStatus.PENDING,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "order.status = :status",
        { status: OrderStatus.PENDING },
      );
    });

    it("should filter by order type", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByUser(mockUserId, {
        orderType: OrderType.DELIVERY,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "order.orderType = :orderType",
        { orderType: OrderType.DELIVERY },
      );
    });

    it("should filter by date range", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByUser(mockUserId, {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "order.createdAt >= :startDate",
        expect.any(Object),
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "order.createdAt <= :endDate",
        expect.any(Object),
      );
    });

    it("should apply pagination", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findByUser(mockUserId, { page: 2, limit: 20 });

      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
    });
  });

  describe("findAll", () => {
    it("should return all orders with filters", async () => {
      const orders = [mockOrder];
      queryBuilder.getManyAndCount.mockResolvedValue([orders, 1]);

      const result = await service.findAll({});

      expect(result.orders).toEqual(orders);
      expect(result.total).toBe(1);
    });

    it("should filter by branch", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ branchId: "branch-123" });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "order.branchId = :branchId",
        { branchId: "branch-123" },
      );
    });

    it("should search by order number or user name", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: "WLY" });

      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe("confirmOrder", () => {
    it("should confirm a pending order", async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepository.findOne.mockResolvedValue(pendingOrder);
      orderRepository.save.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.CONFIRMED,
      });
      statusLogRepository.create.mockReturnValue({});
      statusLogRepository.save.mockResolvedValue({});

      const result = await service.confirmOrder("order-123");

      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "order.status.changed",
        expect.any(Object),
      );
    });

    it("should throw BadRequestException for invalid status transition", async () => {
      const completedOrder = { ...mockOrder, status: OrderStatus.COMPLETED };
      orderRepository.findOne.mockResolvedValue(completedOrder);

      await expect(service.confirmOrder("order-123")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("cancelOrder", () => {
    it("should cancel a pending order by user", async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepository.findOne.mockResolvedValue(pendingOrder);
      orderRepository.save.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.CANCELLED,
      });
      statusLogRepository.create.mockReturnValue({});
      statusLogRepository.save.mockResolvedValue({});

      const result = await service.cancelOrder(
        "order-123",
        mockUserId,
        "Changed my mind",
        false,
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it("should throw BadRequestException when user cannot cancel", async () => {
      const preparingOrder = { ...mockOrder, status: OrderStatus.PREPARING };
      orderRepository.findOne.mockResolvedValue(preparingOrder);

      await expect(
        service.cancelOrder("order-123", mockUserId, "Changed my mind", false),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow admin to cancel any cancellable order", async () => {
      const preparingOrder = { ...mockOrder, status: OrderStatus.PREPARING };
      orderRepository.findOne.mockResolvedValue(preparingOrder);
      orderRepository.save.mockResolvedValue({
        ...preparingOrder,
        status: OrderStatus.CANCELLED,
      });
      statusLogRepository.create.mockReturnValue({});
      statusLogRepository.save.mockResolvedValue({});

      const result = await service.cancelOrder(
        "order-123",
        mockUserId,
        "Admin cancellation",
        true,
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe("updateStatus", () => {
    it("should update order status with valid transition", async () => {
      const confirmedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED };
      orderRepository.findOne.mockResolvedValue(confirmedOrder);
      orderRepository.save.mockResolvedValue({
        ...confirmedOrder,
        status: OrderStatus.PREPARING,
      });
      statusLogRepository.create.mockReturnValue({});
      statusLogRepository.save.mockResolvedValue({});

      const result = await service.updateStatus(
        "order-123",
        OrderStatus.PREPARING,
      );

      expect(result.status).toBe(OrderStatus.PREPARING);
    });

    it("should throw BadRequestException for invalid transition", async () => {
      const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
      orderRepository.findOne.mockResolvedValue(pendingOrder);

      await expect(
        service.updateStatus("order-123", OrderStatus.COMPLETED),
      ).rejects.toThrow(BadRequestException);
    });

    it("should set completedAt when completing order", async () => {
      const readyOrder = { ...mockOrder, status: OrderStatus.READY };
      orderRepository.findOne.mockResolvedValue(readyOrder);
      orderRepository.save.mockImplementation((order) => order);
      statusLogRepository.create.mockReturnValue({});
      statusLogRepository.save.mockResolvedValue({});

      const result = await service.updateStatus(
        "order-123",
        OrderStatus.COMPLETED,
      );

      expect(result.completedAt).toBeDefined();
    });
  });

  describe("createFromCart", () => {
    const mockCart = {
      userId: mockUserId,
      branchId: "branch-123",
      orderType: OrderType.DELIVERY,
      deliveryAddressId: "address-123",
      subtotal: 100,
      discountAmount: 10,
      deliveryFee: 15,
      tax: 5,
      total: 110,
      items: [
        {
          itemId: "item-123",
          itemType: "ITEM",
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100,
          item: {
            name: { en: "Test Item", ar: "عنصر اختبار" },
            description: { en: "Description", ar: "وصف" },
            image: "test.jpg",
          },
        },
      ],
      appliedDiscounts: [
        { discountId: "discount-123", code: "SAVE10", type: "PERCENTAGE", amount: 10 },
      ],
    };

    const mockAddress = {
      id: "address-123",
      addressLine1: "123 Test Street",
      addressLine2: "Apt 4",
      city: "Cairo",
      area: "Maadi",
      latitude: 30.0444,
      longitude: 31.2357,
      deliveryInstructions: "Ring bell",
      contactPhone: "+201234567890",
    };

    it("should create order from cart successfully", async () => {
      addressRepository.findOne.mockResolvedValue(mockAddress);
      mockQueryRunner.manager.create.mockImplementation((_entity, data) => ({
        ...data,
        id: "new-order-123",
      }));
      mockQueryRunner.manager.save.mockImplementation((data) => Promise.resolve(data));
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        id: "new-order-123",
        user: { fullName: "Test User" },
        branch: { name: { en: "Main Branch" } },
      });

      const result = await service.createFromCart(mockUserId, mockCart as any);

      expect(result).toBeDefined();
      expect(mockQueryRunner.manager.create).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    });

    it("should create order without delivery address for pickup", async () => {
      const pickupCart = { ...mockCart, orderType: OrderType.PICKUP, deliveryAddressId: null };
      mockQueryRunner.manager.create.mockImplementation((_entity, data) => ({
        ...data,
        id: "new-order-123",
      }));
      mockQueryRunner.manager.save.mockImplementation((data) => Promise.resolve(data));
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        id: "new-order-123",
        orderType: OrderType.PICKUP,
        user: { fullName: "Test User" },
        branch: { name: { en: "Main Branch" } },
      });

      const result = await service.createFromCart(mockUserId, pickupCart as any);

      expect(result).toBeDefined();
      expect(addressRepository.findOne).not.toHaveBeenCalled();
    });

    it("should rollback transaction on error", async () => {
      mockQueryRunner.manager.create.mockImplementation(() => {
        throw new Error("Database error");
      });

      await expect(
        service.createFromCart(mockUserId, mockCart as any),
      ).rejects.toThrow("Database error");

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it("should use external query runner when provided", async () => {
      const externalQueryRunner = {
        manager: {
          create: jest.fn().mockImplementation((_entity, data) => ({ ...data, id: "new-order-123" })),
          save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
        },
      };

      const result = await service.createFromCart(
        mockUserId,
        mockCart as any,
        undefined,
        undefined,
        undefined,
        externalQueryRunner as any,
      );

      expect(result).toBeDefined();
      expect(mockQueryRunner.connect).not.toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });
  });

  describe("getOrderStats", () => {
    it("should return order statistics for a user", async () => {
      queryBuilder.getCount
        .mockResolvedValueOnce(3) // totalOrders
        .mockResolvedValueOnce(1) // pendingOrders
        .mockResolvedValueOnce(2) // completedOrders
        .mockResolvedValueOnce(0); // cancelledOrders
      queryBuilder.getRawOne.mockResolvedValue({ total: 250 });

      const result = await service.getOrderStats(mockUserId);

      expect(result.totalOrders).toBe(3);
      expect(result.completedOrders).toBe(2);
      expect(result.totalRevenue).toBe(250);
    });

    it("should return zero stats when no orders", async () => {
      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getRawOne.mockResolvedValue({ total: null });

      const result = await service.getOrderStats(mockUserId);

      expect(result.totalOrders).toBe(0);
      expect(result.completedOrders).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });
});
