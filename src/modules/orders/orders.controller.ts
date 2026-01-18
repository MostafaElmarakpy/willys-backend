import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { User } from "src/common/decorators/user.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import {
  createCreatedResponse,
  createPaginatedResponse,
  createSuccessResponse,
} from "src/common/utils/api-response-wrapper";
import { CartService } from "../cart/cart.service";
import { CheckoutService } from "./checkout.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { OrderFilterDto } from "./dto/order-filter.dto";
import {
  OrderListResponseDto,
  OrderResponseDto,
} from "./dto/order-response.dto";
import { CancelOrderDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly checkoutService: CheckoutService,
    private readonly cartService: CartService,
  ) {}

  @Post("checkout")
  async checkout(
    @User("id") userId: string,
    @Body() dto: CheckoutDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await this.checkoutService.processCheckout(
      userId,
      dto,
      ipAddress,
      userAgent,
    );

    return createCreatedResponse(
      {
        order: new OrderResponseDto(result.order),
        payment: result.payment,
      },
      "Order created successfully",
    );
  }

  @Get("checkout/summary")
  async getCheckoutSummary(@User("id") userId: string) {
    const summary = await this.checkoutService.getCheckoutSummary(userId);
    return createSuccessResponse(summary, "Checkout summary retrieved");
  }

  @Get()
  async findAll(
    @User("id") userId: string,
    @Query() filterDto: OrderFilterDto,
  ) {
    const { orders, total } = await this.ordersService.findByUser(
      userId,
      filterDto,
    );

    return createPaginatedResponse(
      orders.map((order) => new OrderListResponseDto(order)),
      filterDto.page || 1,
      filterDto.limit || 10,
      total,
      "Orders retrieved successfully",
    );
  }

  @Get(":id")
  async findOne(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const order = await this.ordersService.findOne(id);

    // Ensure user can only view their own orders
    if (order.userId !== userId) {
      throw new Error("Order not found");
    }

    return createSuccessResponse(
      new OrderResponseDto(order),
      "Order retrieved successfully",
    );
  }

  @Get(":id/status")
  async getOrderStatus(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const order = await this.ordersService.findOne(id);

    if (order.userId !== userId) {
      throw new Error("Order not found");
    }

    return createSuccessResponse(
      {
        status: order.status,
        orderNumber: order.orderNumber,
        statusLogs: order.statusLogs?.map((log) => ({
          status: log.newStatus,
          occurredAt: log.occurredAt,
          notes: log.notes,
        })),
        timestamps: {
          createdAt: order.createdAt,
          confirmedAt: order.confirmedAt,
          preparingAt: order.preparingAt,
          readyAt: order.readyAt,
          outForDeliveryAt: order.outForDeliveryAt,
          completedAt: order.completedAt,
          cancelledAt: order.cancelledAt,
        },
      },
      "Order status retrieved successfully",
    );
  }

  @Post(":id/cancel")
  @HttpCode(200)
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
      false,
      ipAddress,
    );

    return createSuccessResponse(
      new OrderResponseDto(order),
      "Order cancelled successfully",
    );
  }

  @Post(":id/reorder")
  async reorder(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const order = await this.ordersService.findOne(id);

    if (order.userId !== userId) {
      throw new Error("Order not found");
    }

    // Add items from order to cart
    for (const item of order.items || []) {
      await this.cartService.addItem(userId, {
        itemId: item.itemType === "ITEM" ? item.originalItemId : undefined,
        bundleId: item.itemType === "BUNDLE" ? item.originalItemId : undefined,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant,
        customizations: item.customizations,
        extras: item.extras,
        specialInstructions: item.specialInstructions,
      });
    }

    const cart = await this.cartService.getCart(userId);

    return createSuccessResponse(
      cart,
      "Items added to cart from previous order",
    );
  }
}
