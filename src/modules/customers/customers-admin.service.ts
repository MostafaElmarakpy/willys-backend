import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "src/common/enums/OrderStatus";
import { UserRole } from "src/common/enums/UserRole";
import { User } from "src/database/entities/user.entity";
import { DataSource, Repository } from "typeorm";
import { validate as uuidValidate } from "uuid";
import {
  CustomerFilterDto,
  CustomerSortBy,
  LastOrderFilter,
} from "./dto/customer-filter.dto";
import { CustomerOrdersFilterDto } from "./dto/customer-orders-filter.dto";

@Injectable()
export class CustomersAdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get paginated customers list with aggregated order statistics
   * Uses native SQL for optimal performance
   */
  async findAll(filterDto: CustomerFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      lastOrderFilter,
      sortBy = CustomerSortBy.NEWEST_ORDER,
      sortOrder = "DESC",
    } = filterDto;

    const whereConditions: string[] = ["u.role = $1", 'u."deletedAt" IS NULL'];
    const parameters: any[] = [UserRole.user];
    let paramIndex = 2;

    // Search filter (name, email, phone)
    if (search) {
      whereConditions.push(
        `(u."fullName" ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR u."phoneNumber" ILIKE $${paramIndex})`,
      );
      parameters.push(`%${search}%`);
      paramIndex++;
    }

    // Last order date filter
    if (lastOrderFilter) {
      const dateFilter = this.getLastOrderDateFilter(
        lastOrderFilter,
        paramIndex,
      );
      if (dateFilter.condition) {
        whereConditions.push(dateFilter.condition);
        parameters.push(...dateFilter.parameters);
        paramIndex += dateFilter.parameters.length;
      }
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    // Build ORDER BY clause based on sortBy
    const orderByClause = this.buildOrderByClause(sortBy, sortOrder);

    // Main query with aggregations
    const customersQuery = `
      SELECT
        u.id,
        u."fullName",
        u.email,
        u."phoneNumber",
        u."phoneNumberCountryCode",
        u."createdAt",
        COALESCE(order_stats.total_orders, 0)::integer as "totalOrders",
        COALESCE(order_stats.total_spent, 0)::numeric(10,2) as "totalSpent",
        order_stats.last_order_date as "lastOrderDate"
      FROM users u
      LEFT JOIN (
        SELECT
          o."userId",
          COUNT(o.id) as total_orders,
          SUM(CASE WHEN o.status = '${OrderStatus.COMPLETED}' THEN o.total ELSE 0 END) as total_spent,
          MAX(o."createdAt") as last_order_date
        FROM orders o
        WHERE o."deletedAt" IS NULL
        GROUP BY o."userId"
      ) order_stats ON u.id = order_stats."userId"
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN (
        SELECT
          o."userId",
          MAX(o."createdAt") as last_order_date
        FROM orders o
        WHERE o."deletedAt" IS NULL
        GROUP BY o."userId"
      ) order_stats ON u.id = order_stats."userId"
      ${whereClause}
    `;

    const customersParams = [...parameters, limit, (page - 1) * limit];
    const countParams = [...parameters];

    const [customers, countResult] = await Promise.all([
      this.dataSource.query(customersQuery, customersParams),
      this.dataSource.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult[0].total, 10);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get customer details with analytics, orders, and discount usage
   */
  async findOne(customerId: string, ordersFilterDto?: CustomerOrdersFilterDto) {
    if (!uuidValidate(customerId)) {
      throw new BadRequestException("Invalid customer ID format");
    }

    // Get customer basic info
    const customer = await this.userRepository.findOne({
      where: { id: customerId, role: UserRole.user },
      select: [
        "id",
        "fullName",
        "email",
        "phoneNumber",
        "phoneNumberCountryCode",
        "avatar",
        "birthday",
        "gender",
        "status",
        "provider",
        "createdAt",
        "lastLogin",
        "deletedAt",
      ],
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException("Customer not found");
    }

    // Get analytics
    const analytics = await this.getCustomerAnalytics(customerId);

    // Get paginated orders
    const orders = await this.getCustomerOrders(customerId, ordersFilterDto);

    // Get discount usage
    const discountUsage = await this.getCustomerDiscountUsage(customerId);

    return {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      phoneNumberCountryCode: customer.phoneNumberCountryCode,
      avatar: customer.avatar,
      birthday: customer.birthday,
      gender: customer.gender,
      status: customer.status,
      provider: customer.provider,
      createdAt: customer.createdAt,
      lastLogin: customer.lastLogin,
      analytics,
      orders,
      discountUsage,
    };
  }

  /**
   * Get customer analytics using native SQL
   */
  async getCustomerAnalytics(customerId: string) {
    const analyticsQuery = `
      SELECT
        COUNT(o.id)::integer as "totalOrders",
        COALESCE(SUM(CASE WHEN o.status = '${OrderStatus.COMPLETED}' THEN o.total ELSE 0 END), 0)::numeric(10,2) as "totalSpent",
        COALESCE(AVG(CASE WHEN o.status = '${OrderStatus.COMPLETED}' THEN o.total END), 0)::numeric(10,2) as "averageOrderValue",
        MAX(o."createdAt") as "lastOrderDate",
        MIN(o."createdAt") as "firstOrderDate",
        COUNT(CASE WHEN o.status = '${OrderStatus.COMPLETED}' THEN 1 END)::integer as "completedOrders",
        COUNT(CASE WHEN o.status = '${OrderStatus.CANCELLED}' THEN 1 END)::integer as "cancelledOrders",
        MODE() WITHIN GROUP (ORDER BY o."orderType") as "favoriteOrderType"
      FROM orders o
      WHERE o."userId" = $1 AND o."deletedAt" IS NULL
    `;

    const discountSavedQuery = `
      SELECT COALESCE(SUM(d."discountAmount"), 0)::numeric(10,2) as "totalDiscountsSaved"
      FROM discount_usage_logs d
      WHERE d."userId" = $1
    `;

    const [analyticsResult, discountResult] = await Promise.all([
      this.dataSource.query(analyticsQuery, [customerId]),
      this.dataSource.query(discountSavedQuery, [customerId]),
    ]);

    return {
      totalOrders: analyticsResult[0]?.totalOrders || 0,
      totalSpent: parseFloat(analyticsResult[0]?.totalSpent) || 0,
      averageOrderValue: parseFloat(analyticsResult[0]?.averageOrderValue) || 0,
      lastOrderDate: analyticsResult[0]?.lastOrderDate || null,
      firstOrderDate: analyticsResult[0]?.firstOrderDate || null,
      completedOrders: analyticsResult[0]?.completedOrders || 0,
      cancelledOrders: analyticsResult[0]?.cancelledOrders || 0,
      favoriteOrderType: analyticsResult[0]?.favoriteOrderType || null,
      totalDiscountsSaved:
        parseFloat(discountResult[0]?.totalDiscountsSaved) || 0,
    };
  }

  /**
   * Get paginated customer orders with filters
   */
  async getCustomerOrders(
    customerId: string,
    filterDto?: CustomerOrdersFilterDto,
  ) {
    const {
      page = 1,
      limit = 10,
      orderType,
      status,
      fromDate,
      toDate,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = filterDto || {};

    const whereConditions: string[] = [
      'o."userId" = $1',
      'o."deletedAt" IS NULL',
    ];
    const parameters: any[] = [customerId];
    let paramIndex = 2;

    if (orderType) {
      whereConditions.push(`o."orderType" = $${paramIndex}`);
      parameters.push(orderType);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`o.status = $${paramIndex}`);
      parameters.push(status);
      paramIndex++;
    }

    if (fromDate) {
      whereConditions.push(`o."createdAt" >= $${paramIndex}`);
      parameters.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      whereConditions.push(`o."createdAt" <= $${paramIndex}`);
      parameters.push(toDate);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(" AND ")}`;

    const validSortFields = ["createdAt", "total", "status"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderByClause = `ORDER BY o."${sortField}" ${sortOrder}`;

    const ordersQuery = `
      SELECT
        o.id,
        o."orderNumber",
        o."orderType",
        o.status,
        o.total::numeric(10,2),
        o."discountAmount"::numeric(10,2),
        o."createdAt",
        b.name as "branchName"
      FROM orders o
      LEFT JOIN branches b ON o."branchId" = b.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(o.id) as total
      FROM orders o
      ${whereClause}
    `;

    const ordersParams = [...parameters, limit, (page - 1) * limit];
    const countParams = [...parameters];

    const [orders, countResult] = await Promise.all([
      this.dataSource.query(ordersQuery, ordersParams),
      this.dataSource.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult[0].total, 10);

    return {
      items: orders.map((order: any) => ({
        ...order,
        total: parseFloat(order.total),
        discountAmount: parseFloat(order.discountAmount),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get customer discount usage history
   */
  async getCustomerDiscountUsage(customerId: string) {
    const query = `
      SELECT
        d.id as "discountId",
        d.name as "discountName",
        d.code as "discountCode",
        COUNT(dul.id)::integer as "usageCount",
        COALESCE(SUM(dul."discountAmount"), 0)::numeric(10,2) as "totalSaved",
        MAX(dul."usedAt") as "lastUsedAt"
      FROM discount_usage_logs dul
      JOIN discounts d ON dul."discountId" = d.id
      WHERE dul."userId" = $1
      GROUP BY d.id, d.name, d.code
      ORDER BY "lastUsedAt" DESC
    `;

    const results = await this.dataSource.query(query, [customerId]);

    return results.map((row: any) => ({
      ...row,
      totalSaved: parseFloat(row.totalSaved),
    }));
  }

  /**
   * Soft delete a customer
   */
  async remove(customerId: string) {
    if (!uuidValidate(customerId)) {
      throw new BadRequestException("Invalid customer ID format");
    }

    const customer = await this.userRepository.findOne({
      where: { id: customerId, role: UserRole.user },
    });

    if (!customer || customer.deletedAt) {
      throw new NotFoundException("Customer not found");
    }

    return this.userRepository.softDelete(customerId);
  }

  /**
   * Build date filter condition for last order
   */
  private getLastOrderDateFilter(filter: LastOrderFilter, paramIndex: number) {
    const now = new Date();
    let condition: string | null = null;
    const parameters: any[] = [];

    switch (filter) {
      case LastOrderFilter.TODAY:
        condition = `order_stats.last_order_date >= $${paramIndex}::date`;
        parameters.push(now.toISOString().split("T")[0]);
        break;
      case LastOrderFilter.YESTERDAY: {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        condition = `order_stats.last_order_date >= $${paramIndex}::date AND order_stats.last_order_date < $${paramIndex + 1}::date`;
        parameters.push(
          yesterday.toISOString().split("T")[0],
          now.toISOString().split("T")[0],
        );
        break;
      }
      case LastOrderFilter.LAST_7_DAYS: {
        const last7Days = new Date(now);
        last7Days.setDate(last7Days.getDate() - 7);
        condition = `order_stats.last_order_date >= $${paramIndex}`;
        parameters.push(last7Days.toISOString());
        break;
      }
      case LastOrderFilter.LAST_30_DAYS: {
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);
        condition = `order_stats.last_order_date >= $${paramIndex}`;
        parameters.push(last30Days.toISOString());
        break;
      }
    }

    return { condition, parameters };
  }

  /**
   * Build ORDER BY clause based on sort criteria
   */
  private buildOrderByClause(
    sortBy: CustomerSortBy,
    sortOrder: "ASC" | "DESC",
  ) {
    const orderMap: Record<CustomerSortBy, string> = {
      [CustomerSortBy.NEWEST_ORDER]: "order_stats.last_order_date",
      [CustomerSortBy.OLDEST_ORDER]: "order_stats.last_order_date",
      [CustomerSortBy.HIGHEST_SPENT]: "order_stats.total_spent",
      [CustomerSortBy.LOWEST_SPENT]: "order_stats.total_spent",
      [CustomerSortBy.MOST_ORDERS]: "order_stats.total_orders",
      [CustomerSortBy.LEAST_ORDERS]: "order_stats.total_orders",
      [CustomerSortBy.CREATED_AT]: 'u."createdAt"',
    };

    const field = orderMap[sortBy] || "order_stats.last_order_date";

    // Reverse sort order for "oldest" and "lowest" options
    let effectiveSortOrder = sortOrder;
    if (
      sortBy === CustomerSortBy.OLDEST_ORDER ||
      sortBy === CustomerSortBy.LOWEST_SPENT ||
      sortBy === CustomerSortBy.LEAST_ORDERS
    ) {
      effectiveSortOrder = sortOrder === "DESC" ? "ASC" : "DESC";
    }

    return `ORDER BY ${field} ${effectiveSortOrder} NULLS LAST`;
  }
}
