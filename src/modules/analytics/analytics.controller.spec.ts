import { Test, type TestingModule } from "@nestjs/testing";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsController", () => {
  let controller: AnalyticsController;
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockFilter = {
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    page: 1,
    limit: 10,
  };

  const mockOrdersData = {
    data: [
      { date: "2024-01-01", orders: 10 },
      { date: "2024-01-02", orders: 15 },
    ],
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  };

  const mockRevenueData = {
    data: [
      { date: "2024-01-01", revenue: 1000 },
      { date: "2024-01-02", revenue: 1500 },
    ],
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  };

  const mockStatusDistribution = [
    { status: "completed", count: 50 },
    { status: "pending", count: 10 },
  ];

  const mockCategoryRevenue = {
    data: [
      { category: "Burgers", revenue: 5000 },
      { category: "Drinks", revenue: 2000 },
    ],
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  };

  const mockCustomerSegments = [
    { segment: "new", count: 100, value: 1000 },
    { segment: "returning", count: 200, value: 2000 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: {
            getOrdersOverTime: jest.fn(),
            getRevenueOverTime: jest.fn(),
            getOrderStatusDistribution: jest.fn(),
            getRevenueByCategory: jest.fn(),
            getCustomerSegments: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    analyticsService = module.get(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrdersOverTime", () => {
    it("should return orders over time data", async () => {
      analyticsService.getOrdersOverTime.mockResolvedValue(mockOrdersData as any);

      const result = await controller.getOrdersOverTime(mockFilter);

      expect(analyticsService.getOrdersOverTime).toHaveBeenCalledWith(
        mockFilter,
      );
      expect(result.message).toBe("Orders over time retrieved successfully");
      expect(result.data).toEqual(mockOrdersData.data);
    });
  });

  describe("getRevenueOverTime", () => {
    it("should return revenue over time data", async () => {
      analyticsService.getRevenueOverTime.mockResolvedValue(mockRevenueData as any);

      const result = await controller.getRevenueOverTime(mockFilter);

      expect(analyticsService.getRevenueOverTime).toHaveBeenCalledWith(
        mockFilter,
      );
      expect(result.message).toBe("Revenue over time retrieved successfully");
      expect(result.data).toEqual(mockRevenueData.data);
    });
  });

  describe("getOrderStatusDistribution", () => {
    it("should return order status distribution", async () => {
      analyticsService.getOrderStatusDistribution.mockResolvedValue(
        mockStatusDistribution as any,
      );

      const result = await controller.getOrderStatusDistribution(mockFilter);

      expect(analyticsService.getOrderStatusDistribution).toHaveBeenCalledWith(
        mockFilter,
      );
      expect(result.message).toBe(
        "Order status distribution retrieved successfully",
      );
      expect(result.data).toEqual(mockStatusDistribution);
    });
  });

  describe("getRevenueByCategory", () => {
    it("should return revenue by category", async () => {
      analyticsService.getRevenueByCategory.mockResolvedValue(
        mockCategoryRevenue as any,
      );

      const result = await controller.getRevenueByCategory(mockFilter);

      expect(analyticsService.getRevenueByCategory).toHaveBeenCalledWith(
        mockFilter,
      );
      expect(result.message).toBe(
        "Revenue by category retrieved successfully",
      );
      expect(result.data).toEqual(mockCategoryRevenue.data);
    });
  });

  describe("getCustomerSegments", () => {
    it("should return customer segments", async () => {
      analyticsService.getCustomerSegments.mockResolvedValue(
        mockCustomerSegments as any,
      );

      const result = await controller.getCustomerSegments(mockFilter);

      expect(analyticsService.getCustomerSegments).toHaveBeenCalledWith(
        mockFilter,
      );
      expect(result.message).toBe("Customer segments retrieved successfully");
      expect(result.data).toEqual(mockCustomerSegments);
    });
  });

  describe("getDashboardAnalytics", () => {
    it("should return combined dashboard analytics", async () => {
      analyticsService.getOrdersOverTime.mockResolvedValue(mockOrdersData as any);
      analyticsService.getRevenueOverTime.mockResolvedValue(mockRevenueData as any);
      analyticsService.getOrderStatusDistribution.mockResolvedValue(
        mockStatusDistribution as any,
      );
      analyticsService.getRevenueByCategory.mockResolvedValue(
        mockCategoryRevenue as any,
      );
      analyticsService.getCustomerSegments.mockResolvedValue(
        mockCustomerSegments as any,
      );

      const result = await controller.getDashboardAnalytics(mockFilter);

      expect(result.message).toBe(
        "Dashboard analytics retrieved successfully",
      );
      expect(result.data.ordersOverTime).toEqual(mockOrdersData.data);
      expect(result.data.revenueOverTime).toEqual(mockRevenueData.data);
      expect(result.data.orderStatusDistribution).toEqual(
        mockStatusDistribution,
      );
      expect(result.data.revenueByCategory).toEqual(mockCategoryRevenue.data);
      expect(result.data.customerSegments).toEqual(mockCustomerSegments);
    });

    it("should return empty arrays on error", async () => {
      analyticsService.getOrdersOverTime.mockRejectedValue(
        new Error("DB Error"),
      );

      const result = await controller.getDashboardAnalytics(mockFilter);

      expect(result.message).toBe(
        "Dashboard analytics retrieved successfully",
      );
      expect(result.data.ordersOverTime).toEqual([]);
      expect(result.data.revenueOverTime).toEqual([]);
      expect(result.data.orderStatusDistribution).toEqual([]);
      expect(result.data.revenueByCategory).toEqual([]);
      expect(result.data.customerSegments).toEqual([]);
    });
  });
});
