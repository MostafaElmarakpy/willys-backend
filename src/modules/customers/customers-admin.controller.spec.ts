import { Test, type TestingModule } from "@nestjs/testing";
import { CustomersAdminController } from "./customers-admin.controller";
import { CustomersAdminService } from "./customers-admin.service";

describe("CustomersAdminController", () => {
  let controller: CustomersAdminController;
  let customersService: jest.Mocked<CustomersAdminService>;

  const mockCustomerId = "customer-123";

  const mockCustomer = {
    id: mockCustomerId,
    email: "customer@example.com",
    fullName: "Test Customer",
    phoneNumber: "1234567890",
    totalOrders: 10,
    totalSpent: 1000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomersAdminController],
      providers: [
        {
          provide: CustomersAdminService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            getCustomerOrders: jest.fn(),
            getCustomerAnalytics: jest.fn(),
            getCustomerDiscountUsage: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CustomersAdminController>(CustomersAdminController);
    customersService = module.get(CustomersAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated customers", async () => {
      const paginatedResult = {
        customers: [mockCustomer],
        total: 1,
        page: 1,
        limit: 10,
      };
      customersService.findAll.mockResolvedValue(paginatedResult as any);

      const filterDto = { page: 1, limit: 10 };
      const result = await controller.findAll(filterDto);

      expect(customersService.findAll).toHaveBeenCalledWith(filterDto);
      expect(result.message).toBe("Customers retrieved successfully");
    });
  });

  describe("findOne", () => {
    it("should return customer details", async () => {
      customersService.findOne.mockResolvedValue(mockCustomer as any);

      const result = await controller.findOne(mockCustomerId, {});

      expect(customersService.findOne).toHaveBeenCalledWith(mockCustomerId, {});
      expect(result.message).toBe("Customer details retrieved successfully");
    });
  });

  describe("getCustomerOrders", () => {
    it("should return customer orders", async () => {
      const ordersResult = {
        items: [{ id: "order-1" }],
        page: 1,
        limit: 10,
        total: 1,
      };
      customersService.getCustomerOrders.mockResolvedValue(ordersResult as any);

      const filterDto = { page: 1, limit: 10 };
      const result = await controller.getCustomerOrders(
        mockCustomerId,
        filterDto,
      );

      expect(customersService.getCustomerOrders).toHaveBeenCalledWith(
        mockCustomerId,
        filterDto,
      );
      expect(result.message).toBe("Customer orders retrieved successfully");
    });
  });

  describe("getCustomerAnalytics", () => {
    it("should return customer analytics", async () => {
      const analytics = {
        totalOrders: 10,
        totalSpent: 1000,
        averageOrderValue: 100,
        lastOrderDate: new Date(),
      };
      customersService.getCustomerAnalytics.mockResolvedValue(analytics as any);

      const result = await controller.getCustomerAnalytics(mockCustomerId);

      expect(customersService.getCustomerAnalytics).toHaveBeenCalledWith(
        mockCustomerId,
      );
      expect(result.message).toBe("Customer analytics retrieved successfully");
    });
  });

  describe("getCustomerDiscountUsage", () => {
    it("should return customer discount usage", async () => {
      const discountUsage = [
        { discountId: "discount-1", usedCount: 2 },
        { discountId: "discount-2", usedCount: 1 },
      ];
      customersService.getCustomerDiscountUsage.mockResolvedValue(
        discountUsage as any,
      );

      const result = await controller.getCustomerDiscountUsage(mockCustomerId);

      expect(customersService.getCustomerDiscountUsage).toHaveBeenCalledWith(
        mockCustomerId,
      );
      expect(result.message).toBe(
        "Customer discount usage retrieved successfully",
      );
    });
  });

  describe("remove", () => {
    it("should delete a customer", async () => {
      customersService.remove.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.remove(mockCustomerId);

      expect(customersService.remove).toHaveBeenCalledWith(mockCustomerId);
      expect(result.message).toBe("Customer deleted successfully");
    });
  });
});
