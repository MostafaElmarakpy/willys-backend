import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { OrderStatus } from "../../common/enums/OrderStatus";
import { OrderType } from "../../common/enums/OrderType";
import { UserRole } from "../../common/enums/UserRole";
import { UserStatus } from "../../common/enums/UserStatus";
import { User } from "../../database/entities/user.entity";
import { CustomersAdminService } from "./customers-admin.service";
import { CustomerSortBy, LastOrderFilter } from "./dto/customer-filter.dto";
import { CustomerOrdersFilterDto } from "./dto/customer-orders-filter.dto";

jest.mock("uuid", () => ({
  v4: jest.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
  validate: jest.fn((id: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }),
}));

describe("CustomersAdminService", () => {
  let service: CustomersAdminService;
  let userRepository: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockCustomerId = "550e8400-e29b-41d4-a716-446655440000";
  const invalidId = "invalid-id";

  const mockCustomer: Partial<User> = {
    id: mockCustomerId,
    fullName: "Test Customer",
    email: "customer@test.com",
    phoneNumber: "1234567890",
    phoneNumberCountryCode: "EG",
    role: UserRole.user,
    status: UserStatus.Online,
    avatar: "https://example.com/avatar.jpg",
    birthday: new Date("1990-01-01"),
    createdAt: new Date(),
    lastLogin: new Date(),
    deletedAt: undefined,
  };

  const mockCustomerWithStats = {
    id: mockCustomerId,
    fullName: "Test Customer",
    email: "customer@test.com",
    phoneNumber: "1234567890",
    phoneNumberCountryCode: "EG",
    createdAt: new Date(),
    totalOrders: 5,
    totalSpent: "150.00",
    lastOrderDate: new Date(),
  };

  const mockAnalytics = {
    totalOrders: 5,
    totalSpent: "150.00",
    averageOrderValue: "30.00",
    lastOrderDate: new Date(),
    firstOrderDate: new Date("2024-01-01"),
    completedOrders: 4,
    cancelledOrders: 1,
    favoriteOrderType: OrderType.DELIVERY,
  };

  const mockDiscountSaved = {
    totalDiscountsSaved: "25.00",
  };

  const mockOrders = [
    {
      id: "order-1",
      orderNumber: "ORD-001",
      orderType: OrderType.DELIVERY,
      status: OrderStatus.COMPLETED,
      total: "50.00",
      discountAmount: "5.00",
      createdAt: new Date(),
      branchName: { en: "Main Branch", ar: "الفرع الرئيسي" },
    },
  ];

  const mockDiscountUsage = [
    {
      discountId: "discount-1",
      discountName: { en: "Summer Sale", ar: "تخفيضات الصيف" },
      discountCode: "SUMMER20",
      usageCount: 3,
      totalSaved: "25.00",
      lastUsedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersAdminService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomersAdminService>(CustomersAdminService);
    userRepository = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated customers with order statistics", async () => {
      const mockCustomers = [mockCustomerWithStats];
      const mockCount = [{ total: "1" }];

      dataSource.query
        .mockResolvedValueOnce(mockCustomers)
        .mockResolvedValueOnce(mockCount);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.customers).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });

    it("should apply pagination correctly", async () => {
      const mockCustomers = [mockCustomerWithStats];
      const mockCount = [{ total: "25" }];

      dataSource.query
        .mockResolvedValueOnce(mockCustomers)
        .mockResolvedValueOnce(mockCount);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
      // Check that offset is correctly calculated (10 for page 2)
      const customerQueryCall = dataSource.query.mock.calls[0];
      expect(customerQueryCall[1]).toContain(10); // offset
    });

    it("should filter by last order date - today", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ lastOrderFilter: LastOrderFilter.TODAY });

      expect(dataSource.query).toHaveBeenCalled();
      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("last_order_date >=");
    });

    it("should filter by last order date - yesterday", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ lastOrderFilter: LastOrderFilter.YESTERDAY });

      expect(dataSource.query).toHaveBeenCalled();
      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("last_order_date >=");
      expect(query).toContain("last_order_date <");
    });

    it("should filter by last order date - last 7 days", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ lastOrderFilter: LastOrderFilter.LAST_7_DAYS });

      expect(dataSource.query).toHaveBeenCalled();
      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("last_order_date >=");
    });

    it("should filter by last order date - last 30 days", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ lastOrderFilter: LastOrderFilter.LAST_30_DAYS });

      expect(dataSource.query).toHaveBeenCalled();
      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("last_order_date >=");
    });

    it("should sort by highest spent", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ sortBy: CustomerSortBy.HIGHEST_SPENT });

      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("total_spent");
      expect(query).toContain("DESC");
    });

    it("should sort by lowest spent", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ sortBy: CustomerSortBy.LOWEST_SPENT });

      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("total_spent");
      expect(query).toContain("ASC");
    });

    it("should sort by most orders", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ sortBy: CustomerSortBy.MOST_ORDERS });

      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("total_orders");
    });

    it("should sort by least orders", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ sortBy: CustomerSortBy.LEAST_ORDERS });

      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("total_orders");
      expect(query).toContain("ASC");
    });

    it("should sort by newest order", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ sortBy: CustomerSortBy.NEWEST_ORDER });

      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("last_order_date");
      expect(query).toContain("DESC");
    });

    it("should sort by oldest order", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ sortBy: CustomerSortBy.OLDEST_ORDER });

      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain("last_order_date");
      expect(query).toContain("ASC");
    });

    it("should filter by search term", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      await service.findAll({ search: "test" });

      const [query, params] = dataSource.query.mock.calls[0];
      expect(query).toContain("ILIKE");
      expect(params).toContain("%test%");
    });

    it("should return empty array when no customers found", async () => {
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: "0" }]);

      const result = await service.findAll({});

      expect(result.customers).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("findOne", () => {
    it("should return customer with analytics and orders", async () => {
      userRepository.findOne.mockResolvedValue(mockCustomer as User);
      dataSource.query
        .mockResolvedValueOnce([mockAnalytics])
        .mockResolvedValueOnce([mockDiscountSaved])
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([{ total: "1" }])
        .mockResolvedValueOnce(mockDiscountUsage);

      const result = await service.findOne(mockCustomerId);

      expect(result.id).toBe(mockCustomerId);
      expect(result.analytics).toBeDefined();
      expect(result.analytics.totalOrders).toBe(5);
      expect(result.orders).toBeDefined();
      expect(result.discountUsage).toBeDefined();
    });

    it("should throw BadRequestException for invalid UUID", async () => {
      await expect(service.findOne(invalidId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException if customer not found", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockCustomerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException if customer is deleted", async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockCustomer,
        deletedAt: new Date(),
      } as User);

      await expect(service.findOne(mockCustomerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should apply orders filter correctly", async () => {
      userRepository.findOne.mockResolvedValue(mockCustomer as User);
      dataSource.query
        .mockResolvedValueOnce([mockAnalytics])
        .mockResolvedValueOnce([mockDiscountSaved])
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([{ total: "1" }])
        .mockResolvedValueOnce(mockDiscountUsage);

      const ordersFilter: CustomerOrdersFilterDto = {
        orderType: OrderType.DELIVERY,
        status: OrderStatus.COMPLETED,
        fromDate: "2024-01-01",
        toDate: "2024-12-31",
        page: 1,
        limit: 10,
      };

      await service.findOne(mockCustomerId, ordersFilter);

      // Check orders query contains filter conditions
      const ordersQueryCall = dataSource.query.mock.calls[2];
      const query = ordersQueryCall[0];
      expect(query).toContain('"orderType"');
      expect(query).toContain("status");
    });
  });

  describe("getCustomerAnalytics", () => {
    it("should return customer analytics", async () => {
      dataSource.query
        .mockResolvedValueOnce([mockAnalytics])
        .mockResolvedValueOnce([mockDiscountSaved]);

      const result = await service.getCustomerAnalytics(mockCustomerId);

      expect(result.totalOrders).toBe(5);
      expect(result.totalSpent).toBe(150);
      expect(result.averageOrderValue).toBe(30);
      expect(result.completedOrders).toBe(4);
      expect(result.cancelledOrders).toBe(1);
      expect(result.totalDiscountsSaved).toBe(25);
    });

    it("should handle no orders", async () => {
      dataSource.query
        .mockResolvedValueOnce([
          {
            totalOrders: 0,
            totalSpent: null,
            averageOrderValue: null,
            lastOrderDate: null,
            firstOrderDate: null,
            completedOrders: 0,
            cancelledOrders: 0,
            favoriteOrderType: null,
          },
        ])
        .mockResolvedValueOnce([{ totalDiscountsSaved: "0" }]);

      const result = await service.getCustomerAnalytics(mockCustomerId);

      expect(result.totalOrders).toBe(0);
      expect(result.totalSpent).toBe(0);
      expect(result.lastOrderDate).toBeNull();
    });
  });

  describe("getCustomerOrders", () => {
    it("should return paginated orders", async () => {
      dataSource.query
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([{ total: "1" }]);

      const result = await service.getCustomerOrders(mockCustomerId);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("should filter by order type", async () => {
      dataSource.query
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.getCustomerOrders(mockCustomerId, {
        orderType: OrderType.PICKUP,
      });

      const [query, params] = dataSource.query.mock.calls[0];
      expect(query).toContain('"orderType"');
      expect(params).toContain(OrderType.PICKUP);
    });

    it("should filter by status", async () => {
      dataSource.query
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.getCustomerOrders(mockCustomerId, {
        status: OrderStatus.COMPLETED,
      });

      const [query, params] = dataSource.query.mock.calls[0];
      expect(query).toContain("status");
      expect(params).toContain(OrderStatus.COMPLETED);
    });

    it("should filter by date range", async () => {
      dataSource.query
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.getCustomerOrders(mockCustomerId, {
        fromDate: "2024-01-01",
        toDate: "2024-12-31",
      });

      const [query, params] = dataSource.query.mock.calls[0];
      expect(query).toContain('"createdAt" >=');
      expect(query).toContain('"createdAt" <=');
      expect(params).toContain("2024-01-01");
      expect(params).toContain("2024-12-31");
    });

    it("should sort by specified field", async () => {
      dataSource.query
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.getCustomerOrders(mockCustomerId, {
        sortBy: "total",
        sortOrder: "DESC",
      });

      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain('"total"');
      expect(query).toContain("DESC");
    });

    it("should default to createdAt for invalid sort field", async () => {
      dataSource.query
        .mockResolvedValueOnce(mockOrders)
        .mockResolvedValueOnce([{ total: "1" }]);

      await service.getCustomerOrders(mockCustomerId, {
        sortBy: "invalidField" as any,
      });

      const [query] = dataSource.query.mock.calls[0];
      expect(query).toContain('"createdAt"');
    });
  });

  describe("getCustomerDiscountUsage", () => {
    it("should return discount usage history", async () => {
      dataSource.query.mockResolvedValueOnce(mockDiscountUsage);

      const result = await service.getCustomerDiscountUsage(mockCustomerId);

      expect(result).toHaveLength(1);
      expect(result[0].discountCode).toBe("SUMMER20");
      expect(result[0].usageCount).toBe(3);
      expect(result[0].totalSaved).toBe(25);
    });

    it("should return empty array when no discounts used", async () => {
      dataSource.query.mockResolvedValueOnce([]);

      const result = await service.getCustomerDiscountUsage(mockCustomerId);

      expect(result).toHaveLength(0);
    });
  });

  describe("remove", () => {
    it("should soft delete customer successfully", async () => {
      userRepository.findOne.mockResolvedValue(mockCustomer as User);
      userRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockCustomerId);

      expect(userRepository.softDelete).toHaveBeenCalledWith(mockCustomerId);
    });

    it("should throw BadRequestException for invalid UUID", async () => {
      await expect(service.remove(invalidId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException if customer not found", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockCustomerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException if customer already deleted", async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockCustomer,
        deletedAt: new Date(),
      } as User);

      await expect(service.remove(mockCustomerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
