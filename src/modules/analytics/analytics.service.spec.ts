import { Test, type TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { OrderStatus } from "../../common/enums/OrderStatus";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsFilterDto } from "./dto/analytics-filter.dto";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrdersOverTime", () => {
    it("should return orders grouped by date with pagination", async () => {
      const mockCountResult = [{ total: "10" }];
      const mockDataResult = [
        { date: "2024-01-01", orders: 5 },
        { date: "2024-01-02", orders: 8 },
      ];

      dataSource.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult);

      const filter: AnalyticsFilterDto = { page: 1, limit: 30 };
      const result = await service.getOrdersOverTime(filter);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].date).toBe("2024-01-01");
      expect(result.data[0].orders).toBe(5);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(30);
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });

    it("should apply date filters when provided", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "5" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        page: 1,
        limit: 30,
      };

      await service.getOrdersOverTime(filter);

      // Verify the query was called with date parameters
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"createdAt" >='),
        expect.arrayContaining([expect.any(String)]),
      );
    });

    it("should apply branch filter when provided", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "3" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = {
        branchId: "branch-123",
        page: 1,
        limit: 30,
      };

      await service.getOrdersOverTime(filter);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"branchId"'),
        expect.arrayContaining(["branch-123"]),
      );
    });

    it("should return empty data when no orders exist", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = { page: 1, limit: 30 };
      const result = await service.getOrdersOverTime(filter);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe("getRevenueOverTime", () => {
    it("should return revenue grouped by date for completed orders only", async () => {
      const mockCountResult = [{ total: "5" }];
      const mockDataResult = [
        { date: "2024-01-01", revenue: "1500.50" },
        { date: "2024-01-02", revenue: "2300.00" },
      ];

      dataSource.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult);

      const filter: AnalyticsFilterDto = { page: 1, limit: 30 };
      const result = await service.getRevenueOverTime(filter);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].revenue).toBe(1500.5);
      expect(result.data[1].revenue).toBe(2300);
      expect(result.total).toBe(5);

      // Verify COMPLETED status filter is applied
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("status ="),
        expect.arrayContaining([OrderStatus.COMPLETED]),
      );
    });

    it("should handle null revenue as 0", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "1" }])
        .mockResolvedValueOnce([{ date: "2024-01-01", revenue: null }]);

      const filter: AnalyticsFilterDto = { page: 1, limit: 30 };
      const result = await service.getRevenueOverTime(filter);

      expect(result.data[0].revenue).toBe(0);
    });
  });

  describe("getOrderStatusDistribution", () => {
    it("should return order counts grouped by status", async () => {
      const mockResult = [
        { status: OrderStatus.COMPLETED, value: 50 },
        { status: OrderStatus.PENDING, value: 10 },
        { status: OrderStatus.CANCELLED, value: 5 },
      ];

      dataSource.query.mockResolvedValueOnce(mockResult);

      const filter: AnalyticsFilterDto = {};
      const result = await service.getOrderStatusDistribution(filter);

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe(OrderStatus.COMPLETED);
      expect(result[0].value).toBe(50);
      expect(result[1].status).toBe(OrderStatus.PENDING);
      expect(result[1].value).toBe(10);
    });

    it("should apply date and branch filters", async () => {
      dataSource.query.mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        branchId: "branch-123",
      };

      await service.getOrderStatusDistribution(filter);

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"createdAt" >='),
        expect.arrayContaining([
          expect.any(String),
          expect.any(String),
          "branch-123",
        ]),
      );
    });

    it("should return empty array when no orders exist", async () => {
      dataSource.query.mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = {};
      const result = await service.getOrderStatusDistribution(filter);

      expect(result).toHaveLength(0);
    });
  });

  describe("getRevenueByCategory", () => {
    it("should return revenue by category with pagination", async () => {
      const mockCountResult = [{ total: "3" }];
      const mockDataResult = [
        { categoryId: "cat-1", category: "Burgers", revenue: "5000.00" },
        { categoryId: "cat-2", category: "Drinks", revenue: "2500.00" },
      ];

      dataSource.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockDataResult);

      const filter: AnalyticsFilterDto = { page: 1, limit: 30 };
      const result = await service.getRevenueByCategory(filter);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].categoryId).toBe("cat-1");
      expect(result.data[0].category).toBe("Burgers");
      expect(result.data[0].revenue).toBe(5000);
      expect(result.total).toBe(3);
    });

    it("should handle null category name as Unknown", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "1" }])
        .mockResolvedValueOnce([
          { categoryId: "cat-1", category: null, revenue: "1000.00" },
        ]);

      const filter: AnalyticsFilterDto = { page: 1, limit: 30 };
      const result = await service.getRevenueByCategory(filter);

      expect(result.data[0].category).toBe("Unknown");
    });

    it("should only count completed orders for revenue", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = { page: 1, limit: 30 };
      await service.getRevenueByCategory(filter);

      // Verify COMPLETED status filter is applied in the query
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("o.status ="),
        expect.arrayContaining([OrderStatus.COMPLETED]),
      );
    });
  });

  describe("getCustomerSegments", () => {
    it("should return new and returning customer counts", async () => {
      const mockResult = [
        { segment: "new", value: 25 },
        { segment: "returning", value: 75 },
      ];

      dataSource.query.mockResolvedValueOnce(mockResult);

      const filter: AnalyticsFilterDto = { startDate: "2024-01-01" };
      const result = await service.getCustomerSegments(filter);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ segment: "new", value: 25 });
      expect(result[1]).toEqual({ segment: "returning", value: 75 });
    });

    it("should return zeros when no customers exist", async () => {
      dataSource.query.mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = {};
      const result = await service.getCustomerSegments(filter);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ segment: "new", value: 0 });
      expect(result[1]).toEqual({ segment: "returning", value: 0 });
    });

    it("should handle partial results (only new or only returning)", async () => {
      dataSource.query.mockResolvedValueOnce([{ segment: "new", value: 10 }]);

      const filter: AnalyticsFilterDto = { startDate: "2024-01-01" };
      const result = await service.getCustomerSegments(filter);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ segment: "new", value: 10 });
      expect(result[1]).toEqual({ segment: "returning", value: 0 });
    });
  });

  describe("buildWhereClause (private method tested through public methods)", () => {
    it("should build correct where clause with all filters", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = {
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        branchId: "branch-uuid-123",
        page: 1,
        limit: 10,
      };

      await service.getOrdersOverTime(filter);

      // The query should contain all filter conditions
      const queryCall = dataSource.query.mock.calls[0];
      expect(queryCall[0]).toContain('"createdAt" >=');
      expect(queryCall[0]).toContain('"createdAt" <=');
      expect(queryCall[0]).toContain('"branchId"');
    });

    it("should not add conditions when no filters provided", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "0" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = { page: 1, limit: 30 };

      await service.getOrdersOverTime(filter);

      // The query should only have the base condition
      const queryCall = dataSource.query.mock.calls[0];
      expect(queryCall[0]).not.toContain('"branchId"');
      // Parameters should only have pagination values
      expect(queryCall[1]).toHaveLength(0);
    });
  });

  describe("pagination", () => {
    it("should correctly calculate offset from page and limit", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "100" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = { page: 3, limit: 10 };
      await service.getOrdersOverTime(filter);

      // Page 3 with limit 10 should have offset 20
      const dataQueryCall = dataSource.query.mock.calls[1];
      expect(dataQueryCall[1]).toContain(10); // limit
      expect(dataQueryCall[1]).toContain(20); // offset
    });

    it("should use default pagination values", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "10" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = {};
      const result = await service.getOrdersOverTime(filter);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(30);
    });

    it("should correctly calculate totalPages", async () => {
      dataSource.query
        .mockResolvedValueOnce([{ total: "95" }])
        .mockResolvedValueOnce([]);

      const filter: AnalyticsFilterDto = { page: 1, limit: 10 };
      const result = await service.getOrdersOverTime(filter);

      expect(result.totalPages).toBe(10); // ceil(95/10) = 10
    });
  });
});
