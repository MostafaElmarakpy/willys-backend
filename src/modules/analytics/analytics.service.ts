import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { OrderStatus } from "src/common/enums/OrderStatus";
import { DataSource } from "typeorm";
import { AnalyticsFilterDto } from "./dto/analytics-filter.dto";
import {
  CustomerSegmentDto,
  OrderStatusDistributionDto,
  OrdersOverTimeDto,
  RevenueByCategoryDto,
  RevenueOverTimeDto,
} from "./dto/analytics-response.dto";

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getOrdersOverTime(
    filter: AnalyticsFilterDto,
  ): Promise<PaginatedResult<OrdersOverTimeDto>> {
    const { whereClause, params } = this.buildWhereClause(filter);
    const page = filter.page || 1;
    const limit = filter.limit || 30;
    const offset = (page - 1) * limit;

    // Count total distinct dates
    const countQuery = `
      SELECT COUNT(DISTINCT DATE("createdAt")) as total
      FROM orders
      WHERE "deletedAt" IS NULL
      ${whereClause}
    `;

    // Paginated data query with index-friendly date grouping
    const dataQuery = `
      SELECT
        DATE("createdAt") as date,
        COUNT(id)::integer as orders
      FROM orders
      WHERE "deletedAt" IS NULL
      ${whereClause}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
      this.dataSource.query(countQuery, params),
      this.dataSource.query(dataQuery, [...params, limit, offset]),
    ]);

    const total = parseInt(countResult[0]?.total || "0", 10);

    return {
      data: dataResult.map((row: { date: string; orders: number }) => ({
        date: row.date,
        orders: row.orders,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRevenueOverTime(
    filter: AnalyticsFilterDto,
  ): Promise<PaginatedResult<RevenueOverTimeDto>> {
    const { whereClause, params } = this.buildWhereClause(filter);
    const page = filter.page || 1;
    const limit = filter.limit || 30;
    const offset = (page - 1) * limit;

    // Add status filter for completed orders
    const statusParam = params.length + 1;
    const statusWhereClause = `${whereClause} AND status = $${statusParam}`;
    const paramsWithStatus = [...params, OrderStatus.COMPLETED];

    // Count total distinct dates
    const countQuery = `
      SELECT COUNT(DISTINCT DATE("createdAt")) as total
      FROM orders
      WHERE "deletedAt" IS NULL
      ${statusWhereClause}
    `;

    // Paginated data query
    const dataQuery = `
      SELECT
        DATE("createdAt") as date,
        COALESCE(SUM(total), 0)::numeric as revenue
      FROM orders
      WHERE "deletedAt" IS NULL
      ${statusWhereClause}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
      LIMIT $${paramsWithStatus.length + 1} OFFSET $${paramsWithStatus.length + 2}
    `;

    const [countResult, dataResult] = await Promise.all([
      this.dataSource.query(countQuery, paramsWithStatus),
      this.dataSource.query(dataQuery, [...paramsWithStatus, limit, offset]),
    ]);

    const total = parseInt(countResult[0]?.total || "0", 10);

    return {
      data: dataResult.map((row: { date: string; revenue: string }) => ({
        date: row.date,
        revenue: parseFloat(row.revenue) || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderStatusDistribution(
    filter: AnalyticsFilterDto,
  ): Promise<OrderStatusDistributionDto[]> {
    const { whereClause, params } = this.buildWhereClause(filter);

    // Status distribution doesn't need pagination - limited by enum values
    const query = `
      SELECT
        status,
        COUNT(id)::integer as value
      FROM orders
      WHERE "deletedAt" IS NULL
      ${whereClause}
      GROUP BY status
      ORDER BY value DESC
    `;

    const result = await this.dataSource.query(query, params);

    return result.map((row: { status: string; value: number }) => ({
      status: row.status,
      value: row.value,
    }));
  }

  async getRevenueByCategory(
    filter: AnalyticsFilterDto,
  ): Promise<PaginatedResult<RevenueByCategoryDto>> {
    const { whereClause, params } = this.buildWhereClause(filter, "o");
    const page = filter.page || 1;
    const limit = filter.limit || 30;
    const offset = (page - 1) * limit;

    // Add status filter
    const statusParam = params.length + 1;
    const statusWhereClause = `${whereClause} AND o.status = $${statusParam}`;
    const paramsWithStatus = [...params, OrderStatus.COMPLETED];

    // Single optimized query using UNION ALL for items and bundles
    // Uses indexed columns and avoids multiple round trips
    const dataQuery = `
      WITH category_revenue AS (
        SELECT
          c.id as "categoryId",
          c.name->>'en' as category,
          SUM(oi."totalPrice")::numeric as revenue
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi."orderId"
        INNER JOIN items i ON i.id = oi."originalItemId" AND oi."itemType" = 'ITEM'
        INNER JOIN categories c ON c.id = i."categoryId"
        WHERE o."deletedAt" IS NULL
        ${statusWhereClause}
        GROUP BY c.id, c.name

        UNION ALL

        SELECT
          c.id as "categoryId",
          c.name->>'en' as category,
          SUM(oi."totalPrice")::numeric as revenue
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi."orderId"
        INNER JOIN bundles b ON b.id = oi."originalItemId" AND oi."itemType" = 'BUNDLE'
        INNER JOIN categories c ON c.id = b."categoryId"
        WHERE o."deletedAt" IS NULL
        ${statusWhereClause}
        GROUP BY c.id, c.name
      )
      SELECT
        "categoryId",
        category,
        SUM(revenue)::numeric as revenue
      FROM category_revenue
      GROUP BY "categoryId", category
      ORDER BY revenue DESC
      LIMIT $${paramsWithStatus.length * 2 + 1} OFFSET $${paramsWithStatus.length * 2 + 2}
    `;

    // Count query
    const countQuery = `
      WITH category_revenue AS (
        SELECT c.id
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi."orderId"
        INNER JOIN items i ON i.id = oi."originalItemId" AND oi."itemType" = 'ITEM'
        INNER JOIN categories c ON c.id = i."categoryId"
        WHERE o."deletedAt" IS NULL
        ${statusWhereClause}

        UNION

        SELECT c.id
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi."orderId"
        INNER JOIN bundles b ON b.id = oi."originalItemId" AND oi."itemType" = 'BUNDLE'
        INNER JOIN categories c ON c.id = b."categoryId"
        WHERE o."deletedAt" IS NULL
        ${statusWhereClause}
      )
      SELECT COUNT(DISTINCT id) as total FROM category_revenue
    `;

    // Duplicate params for both UNION parts
    const duplicatedParams = [...paramsWithStatus, ...paramsWithStatus];

    const [countResult, dataResult] = await Promise.all([
      this.dataSource.query(countQuery, duplicatedParams),
      this.dataSource.query(dataQuery, [...duplicatedParams, limit, offset]),
    ]);

    const total = parseInt(countResult[0]?.total || "0", 10);

    return {
      data: dataResult.map(
        (row: { categoryId: string; category: string; revenue: string }) => ({
          categoryId: row.categoryId,
          category: row.category || "Unknown",
          revenue: parseFloat(row.revenue) || 0,
        }),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCustomerSegments(
    filter: AnalyticsFilterDto,
  ): Promise<CustomerSegmentDto[]> {
    const { whereClause, params } = this.buildWhereClause(filter);

    // Single optimized query that calculates new vs returning in one pass
    // Uses window function to get first order date per user efficiently
    const query = `
      WITH user_orders AS (
        SELECT
          "userId",
          MIN("createdAt") OVER (PARTITION BY "userId") as first_order_date,
          "createdAt"
        FROM orders
        WHERE "deletedAt" IS NULL
      ),
      users_in_range AS (
        SELECT DISTINCT
          "userId",
          first_order_date
        FROM user_orders
        WHERE TRUE ${whereClause.replace(/AND/g, "AND ")}
      )
      SELECT
        CASE
          WHEN first_order_date >= $${params.length > 0 ? 1 : params.length + 1}::timestamp
          THEN 'new'
          ELSE 'returning'
        END as segment,
        COUNT(*)::integer as value
      FROM users_in_range
      GROUP BY segment
    `;

    // For the segment query, we need the startDate for comparison
    const startDate = filter.startDate || "1970-01-01";
    const segmentParams =
      params.length > 0 ? params : [new Date(startDate).toISOString()];

    const result = await this.dataSource.query(query, segmentParams);

    // Ensure both segments are returned even if one has 0
    const segments = new Map<string, number>([
      ["new", 0],
      ["returning", 0],
    ]);

    result.forEach((row: { segment: string; value: number }) => {
      segments.set(row.segment, row.value);
    });

    return [
      { segment: "new", value: segments.get("new") || 0 },
      { segment: "returning", value: segments.get("returning") || 0 },
    ];
  }

  /**
   * Builds WHERE clause and params array for native SQL queries
   * Uses parameterized queries to prevent SQL injection
   */
  private buildWhereClause(
    filter: AnalyticsFilterDto,
    tableAlias = "",
  ): { whereClause: string; params: (string | Date)[] } {
    const conditions: string[] = [];
    const params: (string | Date)[] = [];
    const prefix = tableAlias ? `${tableAlias}.` : "";

    if (filter.startDate) {
      params.push(new Date(filter.startDate).toISOString());
      conditions.push(`${prefix}"createdAt" >= $${params.length}::timestamp`);
    }

    if (filter.endDate) {
      params.push(new Date(filter.endDate).toISOString());
      conditions.push(`${prefix}"createdAt" <= $${params.length}::timestamp`);
    }

    if (filter.branchId) {
      params.push(filter.branchId);
      conditions.push(`${prefix}"branchId" = $${params.length}::uuid`);
    }

    const whereClause =
      conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    return { whereClause, params };
  }
}
