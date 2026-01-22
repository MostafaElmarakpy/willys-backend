import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Permission } from "src/common/decorators/permissions.decorator";
import { User } from "src/common/decorators/user.decorator";
import { PermissionAction } from "src/common/enums/PermissionAction";
import { PermissionModule } from "src/common/enums/PermissionModule";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import {
  createPaginatedResponse,
  createSuccessResponse,
} from "src/common/utils/api-response-wrapper";
import { OrderFilterDto } from "./dto/order-filter.dto";
import {
  OrderListResponseDto,
  OrderResponseDto,
} from "./dto/order-response.dto";
import {
  CancelOrderDto,
  UpdateOrderStatusDto,
} from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@Controller("admin/orders")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Permission(PermissionModule.ORDERS, PermissionAction.READ)
  async findAll(@Query() filterDto: OrderFilterDto) {
    const { orders, total } = await this.ordersService.findAll(filterDto);

    return createPaginatedResponse(
      orders.map((order) => new OrderListResponseDto(order)),
      filterDto.page || 1,
      filterDto.limit || 10,
      total,
      "Orders retrieved successfully",
    );
  }

  @Get("stats")
  @Permission(PermissionModule.ORDERS, PermissionAction.VIEW_STATS)
  async getStats(@Query("branchId") branchId?: string) {
    const stats = await this.ordersService.getOrderStats(branchId);
    return createSuccessResponse(stats, "Order statistics retrieved");
  }

  @Get("branch/:branchId")
  @Permission(PermissionModule.ORDERS, PermissionAction.READ)
  async findByBranch(
    @Param("branchId", ParseUUIDPipe) branchId: string,
    @Query() filterDto: OrderFilterDto,
  ) {
    filterDto.branchId = branchId;
    const { orders, total } = await this.ordersService.findAll(filterDto);

    return createPaginatedResponse(
      orders.map((order) => new OrderListResponseDto(order)),
      filterDto.page || 1,
      filterDto.limit || 10,
      total,
      "Branch orders retrieved successfully",
    );
  }

  @Get(":id")
  @Permission(PermissionModule.ORDERS, PermissionAction.READ)
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const order = await this.ordersService.findOne(id);
    return createSuccessResponse(
      new OrderResponseDto(order),
      "Order retrieved successfully",
    );
  }

  @Patch(":id/status")
  @Permission(PermissionModule.ORDERS, PermissionAction.UPDATE_STATUS)
  async updateStatus(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;

    const order = await this.ordersService.updateStatus(
      id,
      dto.status,
      userId,
      dto.notes,
      ipAddress,
    );

    return createSuccessResponse(
      new OrderResponseDto(order),
      "Order status updated successfully",
    );
  }

  @Post(":id/cancel")
  @HttpCode(200)
  @Permission(PermissionModule.ORDERS, PermissionAction.CANCEL)
  async cancelOrder(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;

    const order = await this.ordersService.cancelOrder(
      id,
      userId,
      dto.reason,
      true, // isAdmin
      ipAddress,
    );

    return createSuccessResponse(
      new OrderResponseDto(order),
      "Order cancelled successfully",
    );
  }

  @Post(":id/confirm")
  @Permission(PermissionModule.ORDERS, PermissionAction.UPDATE_STATUS)
  async confirmOrder(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const order = await this.ordersService.confirmOrder(id, userId);
    return createSuccessResponse(
      new OrderResponseDto(order),
      "Order confirmed successfully",
    );
  }
}
