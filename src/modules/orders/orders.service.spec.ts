import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderStatusLog } from '../../database/entities/order-status-log.entity';
import { UserAddress } from '../../database/entities/user-address.entity';
import { Cart } from '../../database/entities/cart.entity';
import { OrderStatus } from '../../common/enums/OrderStatus';
import { OrderType } from '../../common/enums/OrderType';
import { OrderFilterDto } from './dto/order-filter.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: jest.Mocked<Repository<Order>>;
  let statusLogRepository: jest.Mocked<Repository<OrderStatusLog>>;
  let addressRepository: jest.Mocked<Repository<UserAddress>>;

  // Mock data
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockOrderId = '550e8400-e29b-41d4-a716-446655440001';
  const mockBranchId = '550e8400-e29b-41d4-a716-446655440002';
  const mockAddressId = '550e8400-e29b-41d4-a716-446655440003';
  const mockPaymentId = '550e8400-e29b-41d4-a716-446655440004';

  const mockOrder: Partial<Order> = {
    id: mockOrderId,
    orderNumber: 'WLY-20260111-0001',
    userId: mockUserId,
    branchId: mockBranchId,
    orderType: OrderType.PICKUP,
    status: OrderStatus.PENDING,
    subtotal: 100,
    discountAmount: 0,
    deliveryFee: 0,
    tax: 14,
    total: 114,
    currency: 'EGP',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    items: [],
    statusLogs: [],
  };

  const mockAddress: Partial<UserAddress> = {
    id: mockAddressId,
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4',
    city: 'Cairo',
    area: 'Maadi',
    latitude: 30.0444,
    longitude: 31.2357,
    deliveryInstructions: 'Ring doorbell',
    contactPhone: '+201234567890',
  };

  const mockCart: Partial<Cart> = {
    id: '550e8400-e29b-41d4-a716-446655440005',
    userId: mockUserId,
    branchId: mockBranchId,
    orderType: OrderType.PICKUP,
    subtotal: 100,
    discountAmount: 0,
    deliveryFee: 0,
    tax: 14,
    total: 114,
    items: [],
  };

  // Mock QueryRunner
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn(),
    },
  };

  // Mock QueryBuilder
  const createMockQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue({ total: 0 }),
  });

  beforeEach(async () => {
    const mockQueryBuilder = createMockQueryBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
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
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get(getRepositoryToken(Order));
    statusLogRepository = module.get(getRepositoryToken(OrderStatusLog));
    addressRepository = module.get(getRepositoryToken(UserAddress));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOrderNumber', () => {
    it('should generate order number with correct format', async () => {
      orderRepository.count.mockResolvedValue(0);

      const result = await service.generateOrderNumber();

      expect(result).toMatch(/^WLY-\d{8}-0001$/);
    });

    it('should increment sequence number based on existing orders', async () => {
      orderRepository.count.mockResolvedValue(5);

      const result = await service.generateOrderNumber();

      expect(result).toMatch(/^WLY-\d{8}-0006$/);
    });

    it('should use current date in order number', async () => {
      orderRepository.count.mockResolvedValue(0);
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      const result = await service.generateOrderNumber();

      expect(result).toContain(today);
    });
  });

  describe('createFromCart', () => {
    beforeEach(() => {
      orderRepository.count.mockResolvedValue(0);
      mockQueryRunner.manager.create.mockImplementation((_, data) => data);
      mockQueryRunner.manager.save.mockImplementation((data) =>
        Promise.resolve({ ...data, id: mockOrderId }),
      );
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);
    });

    it('should create an order from cart successfully', async () => {
      const cart = { ...mockCart, items: [] } as Cart;

      const result = await service.createFromCart(mockUserId, cart);

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should rollback transaction on error', async () => {
      mockQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('Database error'),
      );
      const cart = { ...mockCart, items: [] } as Cart;

      await expect(service.createFromCart(mockUserId, cart)).rejects.toThrow(
        'Database error',
      );
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create delivery address snapshot for delivery orders', async () => {
      const cart = {
        ...mockCart,
        orderType: OrderType.DELIVERY,
        deliveryAddressId: mockAddressId,
        items: [],
      } as Cart;

      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);

      await service.createFromCart(mockUserId, cart);

      expect(addressRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAddressId },
      });
    });

    it('should not fetch address for pickup orders', async () => {
      const cart = {
        ...mockCart,
        orderType: OrderType.PICKUP,
        items: [],
      } as Cart;

      await service.createFromCart(mockUserId, cart);

      expect(addressRepository.findOne).not.toHaveBeenCalled();
    });

    it('should create order items from cart items', async () => {
      const cartItem = {
        id: 'item-1',
        itemType: 'ITEM',
        itemId: 'menu-item-1',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
        item: {
          name: { en: 'Burger', ar: 'برجر' },
          description: { en: 'Delicious', ar: 'لذيذ' },
          image: 'burger.jpg',
        },
        deletedAt: undefined,
      };

      const cart = {
        ...mockCart,
        items: [cartItem],
      } as unknown as Cart;

      await service.createFromCart(mockUserId, cart);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        OrderItem,
        expect.objectContaining({
          itemType: 'ITEM',
          originalItemId: 'menu-item-1',
          quantity: 2,
        }),
      );
    });

    it('should skip deleted cart items', async () => {
      const cartItem = {
        id: 'item-1',
        itemType: 'ITEM',
        itemId: 'menu-item-1',
        quantity: 2,
        deletedAt: new Date(),
      };

      const cart = {
        ...mockCart,
        items: [cartItem],
      } as unknown as Cart;

      await service.createFromCart(mockUserId, cart);

      // Should only call create for Order and OrderStatusLog, not OrderItem
      const orderItemCreates = mockQueryRunner.manager.create.mock.calls.filter(
        (call) => call[0] === OrderItem,
      );
      expect(orderItemCreates).toHaveLength(0);
    });

    it('should create initial status log with PENDING status', async () => {
      const cart = { ...mockCart, items: [] } as Cart;

      await service.createFromCart(mockUserId, cart);

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        OrderStatusLog,
        expect.objectContaining({
          previousStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.PENDING,
          notes: 'Order created',
        }),
      );
    });

    it('should include payment ID if provided', async () => {
      const cart = { ...mockCart, items: [] } as Cart;

      await service.createFromCart(
        mockUserId,
        cart,
        mockPaymentId,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Order,
        expect.objectContaining({
          paymentId: mockPaymentId,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return an order when found', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);

      const result = await service.findOne(mockOrderId);

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockOrderId, deletedAt: expect.anything() },
        relations: ['items', 'statusLogs', 'branch', 'user'],
        order: { statusLogs: { occurredAt: 'ASC' } },
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByOrderNumber', () => {
    it('should return an order when found by order number', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);

      const result = await service.findByOrderNumber('WLY-20260111-0001');

      expect(result).toEqual(mockOrder);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: {
          orderNumber: 'WLY-20260111-0001',
          deletedAt: expect.anything(),
        },
        relations: ['items', 'statusLogs', 'branch'],
      });
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByOrderNumber('WLY-99999999-9999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return orders for a user with pagination', async () => {
      const mockOrders = [mockOrder as Order];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockOrders, 1]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = { page: 1, limit: 10 };
      const result = await service.findByUser(mockUserId, filterDto);

      expect(result.orders).toEqual(mockOrders);
      expect(result.total).toBe(1);
    });

    it('should apply status filter when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = {
        status: OrderStatus.PENDING,
        page: 1,
        limit: 10,
      };
      await service.findByUser(mockUserId, filterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.status = :status',
        { status: OrderStatus.PENDING },
      );
    });

    it('should apply orderType filter when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = {
        orderType: OrderType.DELIVERY,
        page: 1,
        limit: 10,
      };
      await service.findByUser(mockUserId, filterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.orderType = :orderType',
        { orderType: OrderType.DELIVERY },
      );
    });

    it('should apply date range filters when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        page: 1,
        limit: 10,
      };
      await service.findByUser(mockUserId, filterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.createdAt >= :startDate',
        { startDate: expect.any(Date) },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.createdAt <= :endDate',
        { endDate: expect.any(Date) },
      );
    });

    it('should apply sorting when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = {
        sortBy: 'total',
        sortOrder: 'ASC',
        page: 1,
        limit: 10,
      };
      await service.findByUser(mockUserId, filterDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'order.total',
        'ASC',
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders with pagination', async () => {
      const mockOrders = [mockOrder as Order];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockOrders, 1]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = { page: 1, limit: 10 };
      const result = await service.findAll(filterDto);

      expect(result.orders).toEqual(mockOrders);
      expect(result.total).toBe(1);
    });

    it('should apply branchId filter when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = {
        branchId: mockBranchId,
        page: 1,
        limit: 10,
      };
      await service.findAll(filterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.branchId = :branchId',
        { branchId: mockBranchId },
      );
    });

    it('should apply search filter when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = {
        search: 'WLY-2026',
        page: 1,
        limit: 10,
      };
      await service.findAll(filterDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(order.orderNumber ILIKE :search OR user.email ILIKE :search)',
        { search: '%WLY-2026%' },
      );
    });

    it('should join user relation for admin view', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const filterDto: OrderFilterDto = { page: 1, limit: 10 };
      await service.findAll(filterDto);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'order.user',
        'user',
      );
    });
  });

  describe('updateStatus', () => {
    beforeEach(() => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      } as Order);
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as Order),
      );
      statusLogRepository.create.mockImplementation(
        (data) => data as OrderStatusLog,
      );
      statusLogRepository.save.mockImplementation((log) =>
        Promise.resolve(log as OrderStatusLog),
      );
    });

    it('should update status when transition is valid', async () => {
      await service.updateStatus(
        mockOrderId,
        OrderStatus.CONFIRMED,
        mockUserId,
      );

      expect(orderRepository.save).toHaveBeenCalled();
      expect(statusLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          previousStatus: OrderStatus.PENDING,
          newStatus: OrderStatus.CONFIRMED,
        }),
      );
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      await expect(
        service.updateStatus(mockOrderId, OrderStatus.COMPLETED, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set confirmedAt timestamp when transitioning to CONFIRMED', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      } as Order);

      await service.updateStatus(mockOrderId, OrderStatus.CONFIRMED);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmedAt: expect.any(Date),
        }),
      );
    });

    it('should set preparingAt timestamp when transitioning to PREPARING', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      await service.updateStatus(mockOrderId, OrderStatus.PREPARING);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          preparingAt: expect.any(Date),
        }),
      );
    });

    it('should set readyAt timestamp when transitioning to READY', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PREPARING,
      } as Order);

      await service.updateStatus(mockOrderId, OrderStatus.READY);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          readyAt: expect.any(Date),
        }),
      );
    });

    it('should set outForDeliveryAt timestamp when transitioning to OUT_FOR_DELIVERY', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PREPARING,
      } as Order);

      await service.updateStatus(mockOrderId, OrderStatus.OUT_FOR_DELIVERY);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          outForDeliveryAt: expect.any(Date),
        }),
      );
    });

    it('should set completedAt timestamp when transitioning to COMPLETED', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.READY,
      } as Order);

      await service.updateStatus(mockOrderId, OrderStatus.COMPLETED);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should set actualPickupTime for pickup orders when completed', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.READY,
        orderType: OrderType.PICKUP,
      } as Order);

      await service.updateStatus(mockOrderId, OrderStatus.COMPLETED);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          actualPickupTime: expect.any(Date),
        }),
      );
    });

    it('should set cancelledAt and cancelledById when transitioning to CANCELLED', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      } as Order);

      await service.updateStatus(
        mockOrderId,
        OrderStatus.CANCELLED,
        mockUserId,
      );

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelledAt: expect.any(Date),
          cancelledById: mockUserId,
        }),
      );
    });

    it('should include notes and ipAddress in status log', async () => {
      await service.updateStatus(
        mockOrderId,
        OrderStatus.CONFIRMED,
        mockUserId,
        'Order confirmed by admin',
        '192.168.1.1',
      );

      expect(statusLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Order confirmed by admin',
          ipAddress: '192.168.1.1',
          changedById: mockUserId,
        }),
      );
    });
  });

  describe('cancelOrder', () => {
    beforeEach(() => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
        userId: mockUserId,
      } as Order);
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as Order),
      );
      statusLogRepository.create.mockImplementation(
        (data) => data as OrderStatusLog,
      );
      statusLogRepository.save.mockImplementation((log) =>
        Promise.resolve(log as OrderStatusLog),
      );
    });

    it('should allow user to cancel their own pending order', async () => {
      await service.cancelOrder(
        mockOrderId,
        mockUserId,
        'Changed my mind',
        false,
      );

      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user tries to cancel another users order', async () => {
      const differentUserId = '550e8400-e29b-41d4-a716-446655440099';

      await expect(
        service.cancelOrder(mockOrderId, differentUserId, 'Testing', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user tries to cancel non-cancellable order', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PREPARING,
        userId: mockUserId,
      } as Order);

      await expect(
        service.cancelOrder(mockOrderId, mockUserId, 'Changed my mind', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow admin to cancel orders in any status except completed/cancelled/refunded', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PREPARING,
        userId: mockUserId,
      } as Order);

      await service.cancelOrder(
        mockOrderId,
        'admin-user-id',
        'Restaurant issue',
        true,
      );

      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to cancel completed order', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      } as Order);

      await expect(
        service.cancelOrder(mockOrderId, mockUserId, 'Too late', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to cancel already cancelled order', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order);

      await expect(
        service.cancelOrder(mockOrderId, mockUserId, 'Double cancel', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when trying to cancel refunded order', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.REFUNDED,
      } as Order);

      await expect(
        service.cancelOrder(mockOrderId, mockUserId, 'Already refunded', true),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set cancellation reason on order', async () => {
      await service.cancelOrder(
        mockOrderId,
        mockUserId,
        'Item unavailable',
        false,
      );

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cancellationReason: 'Item unavailable',
        }),
      );
    });
  });

  describe('linkPayment', () => {
    it('should link payment to order', async () => {
      orderRepository.findOne.mockResolvedValue(mockOrder as Order);
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as Order),
      );

      await service.linkPayment(mockOrderId, mockPaymentId);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: mockPaymentId,
        }),
      );
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.linkPayment('non-existent', mockPaymentId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmOrder', () => {
    beforeEach(() => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      } as Order);
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as Order),
      );
      statusLogRepository.create.mockImplementation(
        (data) => data as OrderStatusLog,
      );
      statusLogRepository.save.mockImplementation((log) =>
        Promise.resolve(log as OrderStatusLog),
      );
    });

    it('should confirm order by updating status to CONFIRMED', async () => {
      await service.confirmOrder(mockOrderId, mockUserId);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.CONFIRMED,
        }),
      );
    });

    it('should throw BadRequestException if order is not pending', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PREPARING,
      } as Order);

      await expect(service.confirmOrder(mockOrderId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount
        .mockResolvedValueOnce(100) // totalOrders
        .mockResolvedValueOnce(20) // pendingOrders
        .mockResolvedValueOnce(70) // completedOrders
        .mockResolvedValueOnce(10); // cancelledOrders
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: 7000 });
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const result = await service.getOrderStats();

      expect(result).toEqual({
        totalOrders: 100,
        pendingOrders: 20,
        completedOrders: 70,
        cancelledOrders: 10,
        totalRevenue: 7000,
        averageOrderValue: 100,
      });
    });

    it('should filter by branchId when provided', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: 0 });
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      await service.getOrderStats(mockBranchId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'order.branchId = :branchId',
        { branchId: mockBranchId },
      );
    });

    it('should return zero average when no completed orders', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: null });
      orderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<Order>,
      );

      const result = await service.getOrderStats();

      expect(result.averageOrderValue).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });

  describe('requiresRefund', () => {
    it('should return true for CONFIRMED status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      const result = await service.requiresRefund(mockOrderId);

      expect(result).toBe(true);
    });

    it('should return true for PREPARING status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PREPARING,
      } as Order);

      const result = await service.requiresRefund(mockOrderId);

      expect(result).toBe(true);
    });

    it('should return true for READY status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.READY,
      } as Order);

      const result = await service.requiresRefund(mockOrderId);

      expect(result).toBe(true);
    });

    it('should return true for OUT_FOR_DELIVERY status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.OUT_FOR_DELIVERY,
      } as Order);

      const result = await service.requiresRefund(mockOrderId);

      expect(result).toBe(true);
    });

    it('should return false for PENDING status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      } as Order);

      const result = await service.requiresRefund(mockOrderId);

      expect(result).toBe(false);
    });

    it('should return false for COMPLETED status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      } as Order);

      const result = await service.requiresRefund(mockOrderId);

      expect(result).toBe(false);
    });

    it('should return false for CANCELLED status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order);

      const result = await service.requiresRefund(mockOrderId);

      expect(result).toBe(false);
    });

    it('should throw NotFoundException when order not found', async () => {
      orderRepository.findOne.mockResolvedValue(null);

      await expect(service.requiresRefund('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('status transitions', () => {
    beforeEach(() => {
      orderRepository.save.mockImplementation((order) =>
        Promise.resolve(order as Order),
      );
      statusLogRepository.create.mockImplementation(
        (data) => data as OrderStatusLog,
      );
      statusLogRepository.save.mockImplementation((log) =>
        Promise.resolve(log as OrderStatusLog),
      );
    });

    it('should allow PENDING -> CONFIRMED', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.CONFIRMED),
      ).resolves.not.toThrow();
    });

    it('should allow PENDING -> CANCELLED', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.CANCELLED),
      ).resolves.not.toThrow();
    });

    it('should allow CONFIRMED -> PREPARING', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.PREPARING),
      ).resolves.not.toThrow();
    });

    it('should allow PREPARING -> READY', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PREPARING,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.READY),
      ).resolves.not.toThrow();
    });

    it('should allow PREPARING -> OUT_FOR_DELIVERY', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PREPARING,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.OUT_FOR_DELIVERY),
      ).resolves.not.toThrow();
    });

    it('should allow READY -> COMPLETED', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.READY,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.COMPLETED),
      ).resolves.not.toThrow();
    });

    it('should allow OUT_FOR_DELIVERY -> COMPLETED', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.OUT_FOR_DELIVERY,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.COMPLETED),
      ).resolves.not.toThrow();
    });

    it('should allow COMPLETED -> REFUNDED', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.COMPLETED,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.REFUNDED),
      ).resolves.not.toThrow();
    });

    it('should NOT allow PENDING -> PREPARING (skip CONFIRMED)', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.PREPARING),
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT allow CANCELLED -> any status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.PENDING),
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT allow REFUNDED -> any status', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.REFUNDED,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.COMPLETED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should NOT allow backwards transitions (CONFIRMED -> PENDING)', async () => {
      orderRepository.findOne.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as Order);

      await expect(
        service.updateStatus(mockOrderId, OrderStatus.PENDING),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
