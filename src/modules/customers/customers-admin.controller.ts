import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Version,
} from "@nestjs/common";
import { Permission } from "src/common/decorators/permissions.decorator";
import { PermissionAction } from "src/common/enums/PermissionAction";
import { PermissionModule } from "src/common/enums/PermissionModule";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import {
  createPaginatedResponse,
  createSuccessResponse,
} from "src/common/utils/api-response-wrapper";
import { CustomersAdminService } from "./customers-admin.service";
import { CustomerFilterDto } from "./dto/customer-filter.dto";
import { CustomerOrdersFilterDto } from "./dto/customer-orders-filter.dto";

@Controller("admin/customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersAdminController {
  constructor(private readonly customersService: CustomersAdminService) {}

  /**
   * GET /admin/customers
   * Get paginated list of customers with aggregated statistics
   */
  @Get()
  @Version("1")
  @Permission(PermissionModule.CUSTOMERS, PermissionAction.READ)
  async findAll(@Query() filterDto: CustomerFilterDto) {
    const result = await this.customersService.findAll(filterDto);

    return createPaginatedResponse(
      result.customers,
      result.page,
      result.limit,
      result.total,
      "Customers retrieved successfully",
    );
  }

  /**
   * GET /admin/customers/:id
   * Get customer details with analytics, orders, and discount usage
   */
  @Get(":id")
  @Version("1")
  @Permission(PermissionModule.CUSTOMERS, PermissionAction.READ)
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() ordersFilterDto: CustomerOrdersFilterDto,
  ) {
    const customer = await this.customersService.findOne(id, ordersFilterDto);
    return createSuccessResponse(
      customer,
      "Customer details retrieved successfully",
    );
  }

  /**
   * GET /admin/customers/:id/orders
   * Get paginated orders for a specific customer
   */
  @Get(":id/orders")
  @Version("1")
  @Permission(PermissionModule.CUSTOMERS, PermissionAction.READ)
  async getCustomerOrders(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() filterDto: CustomerOrdersFilterDto,
  ) {
    const orders = await this.customersService.getCustomerOrders(id, filterDto);

    return createPaginatedResponse(
      orders.items,
      orders.page,
      orders.limit,
      orders.total,
      "Customer orders retrieved successfully",
    );
  }

  /**
   * GET /admin/customers/:id/analytics
   * Get customer analytics
   */
  @Get(":id/analytics")
  @Version("1")
  @Permission(PermissionModule.CUSTOMERS, PermissionAction.VIEW_STATS)
  async getCustomerAnalytics(@Param("id", ParseUUIDPipe) id: string) {
    const analytics = await this.customersService.getCustomerAnalytics(id);
    return createSuccessResponse(
      analytics,
      "Customer analytics retrieved successfully",
    );
  }

  /**
   * GET /admin/customers/:id/discounts
   * Get customer discount usage history
   */
  @Get(":id/discounts")
  @Version("1")
  @Permission(PermissionModule.CUSTOMERS, PermissionAction.READ)
  async getCustomerDiscountUsage(@Param("id", ParseUUIDPipe) id: string) {
    const discountUsage =
      await this.customersService.getCustomerDiscountUsage(id);
    return createSuccessResponse(
      discountUsage,
      "Customer discount usage retrieved successfully",
    );
  }

  /**
   * DELETE /admin/customers/:id
   * Soft delete a customer
   */
  @Delete(":id")
  @Version("1")
  @Permission(PermissionModule.CUSTOMERS, PermissionAction.DELETE)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.customersService.remove(id);
    return createSuccessResponse(null, "Customer deleted successfully");
  }
}
