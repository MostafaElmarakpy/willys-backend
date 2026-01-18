import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { User } from "src/common/decorators/user.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import {
  createCreatedResponse,
  createSuccessResponse,
} from "src/common/utils/api-response-wrapper";
import { CartService } from "./cart.service";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { ApplyDiscountDto } from "./dto/apply-discount.dto";
import { CartResponseDto } from "./dto/cart-response.dto";
import {
  SetBranchDto,
  SetDeliveryAddressDto,
  SetOrderTypeDto,
  SetPickupTimeDto,
} from "./dto/set-order-type.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

@Controller("cart")
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@User("id") userId: string) {
    const cart = await this.cartService.getCart(userId);
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Cart retrieved successfully",
    );
  }

  @Post("items")
  async addItem(@User("id") userId: string, @Body() dto: AddToCartDto) {
    const cart = await this.cartService.addItem(userId, dto);
    return createCreatedResponse(
      new CartResponseDto(cart),
      "Item added to cart successfully",
    );
  }

  @Patch("items/:id")
  async updateItem(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.updateItem(userId, id, dto);
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Cart item updated successfully",
    );
  }

  @Delete("items/:id")
  async removeItem(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const cart = await this.cartService.removeItem(userId, id);
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Item removed from cart successfully",
    );
  }

  @Delete()
  async clearCart(@User("id") userId: string) {
    const cart = await this.cartService.clearCart(userId);
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Cart cleared successfully",
    );
  }

  @Post("order-type")
  async setOrderType(@User("id") userId: string, @Body() dto: SetOrderTypeDto) {
    const cart = await this.cartService.setOrderType(userId, dto.orderType);
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Order type set successfully",
    );
  }

  @Post("branch")
  async setBranch(@User("id") userId: string, @Body() dto: SetBranchDto) {
    const cart = await this.cartService.setBranch(userId, dto.branchId);
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Branch set successfully",
    );
  }

  @Post("delivery-address")
  async setDeliveryAddress(
    @User("id") userId: string,
    @Body() dto: SetDeliveryAddressDto,
  ) {
    const cart = await this.cartService.setDeliveryAddress(
      userId,
      dto.deliveryAddressId,
    );
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Delivery address set successfully",
    );
  }

  @Post("pickup-time")
  async setPickupTime(
    @User("id") userId: string,
    @Body() dto: SetPickupTimeDto,
  ) {
    const cart = await this.cartService.setPickupTime(
      userId,
      dto.scheduledPickupTime,
    );
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Pickup time set successfully",
    );
  }

  @Post("discount")
  async applyDiscount(
    @User("id") userId: string,
    @Body() dto: ApplyDiscountDto,
  ) {
    const cart = await this.cartService.applyDiscount(userId, dto.code);
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Discount applied successfully",
    );
  }

  @Delete("discount/:id")
  async removeDiscount(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const cart = await this.cartService.removeDiscount(userId, id);
    return createSuccessResponse(
      new CartResponseDto(cart),
      "Discount removed successfully",
    );
  }

  @Post("validate")
  @HttpCode(200)
  async validateCart(@User("id") userId: string) {
    const result = await this.cartService.validateCart(userId);
    return createSuccessResponse(result, "Cart validation completed");
  }

  @Get("summary")
  async getCartSummary(@User("id") userId: string) {
    const cart = await this.cartService.getCart(userId);
    const cartDto = new CartResponseDto(cart);
    return createSuccessResponse(cartDto.summary, "Cart summary retrieved");
  }
}
