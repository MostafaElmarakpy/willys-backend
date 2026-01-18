import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Permission } from "src/common/decorators/permissions.decorator";
import { PermissionAction } from "src/common/enums/PermissionAction";
import { PermissionModule } from "src/common/enums/PermissionModule";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import {
  createPaginatedResponse,
  createSuccessResponse,
} from "src/common/utils/api-response-wrapper";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsFilterDto } from "./dto/analytics-filter.dto";

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("orders-over-time")
  @Permission(PermissionModule.ORDERS, PermissionAction.VIEW_STATS)
  async getOrdersOverTime(@Query() filter: AnalyticsFilterDto) {
    const result = await this.analyticsService.getOrdersOverTime(filter);
    return createPaginatedResponse(
      result.data,
      result.page,
      result.limit,
      result.total,
      "Orders over time retrieved successfully",
    );
  }

  @Get("revenue-over-time")
  @Permission(PermissionModule.ORDERS, PermissionAction.VIEW_STATS)
  async getRevenueOverTime(@Query() filter: AnalyticsFilterDto) {
    const result = await this.analyticsService.getRevenueOverTime(filter);
    return createPaginatedResponse(
      result.data,
      result.page,
      result.limit,
      result.total,
      "Revenue over time retrieved successfully",
    );
  }

  @Get("order-status-distribution")
  @Permission(PermissionModule.ORDERS, PermissionAction.VIEW_STATS)
  async getOrderStatusDistribution(@Query() filter: AnalyticsFilterDto) {
    const data = await this.analyticsService.getOrderStatusDistribution(filter);
    return createSuccessResponse(
      data,
      "Order status distribution retrieved successfully",
    );
  }

  @Get("revenue-by-category")
  @Permission(PermissionModule.ORDERS, PermissionAction.VIEW_STATS)
  async getRevenueByCategory(@Query() filter: AnalyticsFilterDto) {
    const result = await this.analyticsService.getRevenueByCategory(filter);
    return createPaginatedResponse(
      result.data,
      result.page,
      result.limit,
      result.total,
      "Revenue by category retrieved successfully",
    );
  }

  @Get("customer-segments")
  @Permission(PermissionModule.ORDERS, PermissionAction.VIEW_STATS)
  async getCustomerSegments(@Query() filter: AnalyticsFilterDto) {
    const data = await this.analyticsService.getCustomerSegments(filter);
    return createSuccessResponse(
      data,
      "Customer segments retrieved successfully",
    );
  }

  @Get("dashboard")
  @Permission(PermissionModule.ORDERS, PermissionAction.VIEW_STATS)
  async getDashboardAnalytics(@Query() filter: AnalyticsFilterDto) {
    const [
      ordersOverTime,
      revenueOverTime,
      orderStatusDistribution,
      revenueByCategory,
      customerSegments,
    ] = await Promise.all([
      this.analyticsService.getOrdersOverTime(filter),
      this.analyticsService.getRevenueOverTime(filter),
      this.analyticsService.getOrderStatusDistribution(filter),
      this.analyticsService.getRevenueByCategory(filter),
      this.analyticsService.getCustomerSegments(filter),
    ]);

    return createSuccessResponse(
      {
        ordersOverTime: ordersOverTime.data,
        revenueOverTime: revenueOverTime.data,
        orderStatusDistribution,
        revenueByCategory: revenueByCategory.data,
        customerSegments,
      },
      "Dashboard analytics retrieved successfully",
    );
  }
}
