import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DiscountTargetType } from "src/common/enums/DiscountTargetType";
import { OrderStatus } from "src/common/enums/OrderStatus";
import { PaymentStatus } from "src/common/enums/PaymentStatus";
import { PaymentType } from "src/common/enums/PaymentType";
import type { AppliedDiscount } from "src/database/entities/cart.entity";
import { Cart } from "src/database/entities/cart.entity";
import { Discount } from "src/database/entities/discount.entity";
import { Order } from "src/database/entities/order.entity";
import { User } from "src/database/entities/user.entity";
import { UserDiscount } from "src/database/entities/user-discount.entity";
import { DataSource, type QueryRunner, type Repository } from "typeorm";
import { CartService } from "../cart/cart.service";
import { DiscountsService } from "../discounts/discounts.service";
import { PaymentsService } from "../payments/payments.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { OrdersService } from "./orders.service";

interface CheckoutResult {
  order: Order;
  payment: {
    id: string;
    status: string;
    iframeUrl?: string;
    cashReferenceNumber?: string;
  };
}

@Injectable()
export class CheckoutService {
  private readonly processedIdempotencyKeys = new Map<string, string>();

  constructor(
    @InjectRepository(Order) readonly orderRepository: Repository<Order>,
    @InjectRepository(Cart) readonly cartRepository: Repository<Cart>,
    @InjectRepository(User) readonly userRepository: Repository<User>,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly discountsService: DiscountsService,
    private readonly dataSource: DataSource,
  ) {}

  async processCheckout(
    userId: string,
    dto: CheckoutDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CheckoutResult> {
    // Check idempotency key
    const existingOrderId = this.processedIdempotencyKeys.get(
      dto.idempotencyKey,
    );
    if (existingOrderId) {
      const existingOrder = await this.ordersService.findOne(existingOrderId);
      return {
        order: existingOrder,
        payment: {
          id: existingOrder.paymentId || "",
          status: "EXISTING",
        },
      };
    }

    // Validate cart
    const validationResult = await this.cartService.validateCart(userId);
    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: "Cart validation failed",
        errors: validationResult.errors,
      });
    }

    // Get cart with all data
    const cart = await this.cartService.getCart(userId);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    if (!cart.orderType) {
      throw new BadRequestException("Order type not selected");
    }

    if (!cart.branchId) {
      throw new BadRequestException("Branch not selected");
    }

    // Load user data for payment processing
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (!user.phoneNumber || !user.phoneNumberCountryCode) {
      throw new BadRequestException(
        "User phone number is required for checkout",
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.validateDiscountsWithLock(
        queryRunner,
        cart.appliedDiscounts || [],
        userId,
      );

      // Create order from cart (pass queryRunner to avoid nested transactions)
      const order = await this.ordersService.createFromCart(
        userId,
        cart,
        undefined,
        ipAddress,
        userAgent,
        queryRunner,
      );

      // Record discount usage (pass queryRunner to avoid nested transactions)
      // Skip global increment since it was already incremented when applying to cart
      for (const appliedDiscount of cart.appliedDiscounts || []) {
        await this.discountsService.recordUsage(
          appliedDiscount.discountId,
          userId,
          appliedDiscount.amount,
          undefined,
          order.id,
          queryRunner,
          true, // skipGlobalIncrement - already incremented when applying to cart
        );
      }

      // Create payment
      const payment = await this.paymentsService.createPayment(
        {
          amount: Number(order.total),
          paymentType: dto.paymentType,
          merchantOrderId: order.orderNumber,
          description: `Order ${order.orderNumber}`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
          paymentMethodId: dto.paymentMethodId,
        },
        userId,
      );

      // Link payment to order within the transaction
      await queryRunner.manager.update(
        Order,
        { id: order.id },
        { paymentId: payment.id },
      );

      // Process payment
      let paymentResult: any;

      if (dto.paymentType === PaymentType.CARD) {
        // Parse user's full name into first and last name
        const nameParts = user.fullName.split(" ");
        const firstName = nameParts[0] || "Customer";
        const lastName = nameParts.slice(1).join(" ") || "Name";

        paymentResult = await this.paymentsService.processCardPayment(
          payment.id,
          userId,
          {
            firstName,
            lastName,
            email: user.email || `user_${userId}@example.com`,
            phone: user.phoneNumberCountryCode + user.phoneNumber,
          },
        );
      } else {
        paymentResult = await this.paymentsService.processCashPayment(
          payment.id,
          userId,
        );

        // For cash payments, confirm order immediately within the transaction
        await queryRunner.manager.update(
          Order,
          { id: order.id },
          { status: OrderStatus.CONFIRMED, confirmedAt: new Date() },
        );
      }

      // Clear cart on success (don't release discounts - they're already recorded in the order)
      await this.cartService.clearCart(userId, false);

      // Store idempotency key
      this.processedIdempotencyKeys.set(dto.idempotencyKey, order.id);

      // Clean up old idempotency keys (keep for 24 hours)
      setTimeout(
        () => {
          this.processedIdempotencyKeys.delete(dto.idempotencyKey);
        },
        24 * 60 * 60 * 1000,
      );

      await queryRunner.commitTransaction();

      // Fetch updated order with relations
      // If fetchfails for any reason, fall back to the order we have
      let updatedOrder: Order;
      try {
        updatedOrder = await this.ordersService.findOne(order.id);
      } catch {
        // If we can't find the order, use the one we have
        // This shouldn't happen but provides a fallback
        updatedOrder = order;
      }

      return {
        order: updatedOrder,
        payment: {
          id: payment.id,
          status: paymentResult.status || "PENDING",
          iframeUrl: paymentResult.iframeUrl,
          cashReferenceNumber: paymentResult.cashReferenceNumber,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getCheckoutSummary(userId: string): Promise<{
    cart: Cart;
    canCheckout: boolean;
    validationErrors: Array<{ error: string }>;
    estimatedTime: number;
  }> {
    const cart = await this.cartService.getCart(userId);
    const validation = await this.cartService.validateCart(userId);

    const estimatedTime =
      (cart.orderType === "DELIVERY" ? 30 : 15) + (cart.items?.length || 0) * 2;

    return {
      cart,
      canCheckout: validation.isValid,
      validationErrors: validation.errors,
      estimatedTime,
    };
  }

  async handlePaymentConfirmation(
    paymentId: string,
    status: PaymentStatus,
  ): Promise<void> {
    // Find order by payment ID
    const order = await this.orderRepository.findOne({
      where: { paymentId },
    });

    if (!order) {
      return;
    }

    if (status === PaymentStatus.SUCCESS) {
      // Confirm order on successful payment
      await this.ordersService.confirmOrder(order.id);
    } else if (status === PaymentStatus.FAILED) {
      // Cancel order on failed payment
      await this.ordersService.cancelOrder(
        order.id,
        order.userId,
        "Payment failed",
        true,
      );
    }
  }

  private async validateDiscountsWithLock(
    queryRunner: QueryRunner,
    appliedDiscounts: AppliedDiscount[],
    userId: string,
  ): Promise<void> {
    for (const appliedDiscount of appliedDiscounts) {
      // Lock the discount row for update
      const discount = await queryRunner.manager
        .createQueryBuilder(Discount, "discount")
        .where("discount.id = :id", { id: appliedDiscount.discountId })
        .andWhere("discount.deletedAt IS NULL")
        .setLock("pessimistic_write")
        .getOne();

      if (!discount) {
        throw new BadRequestException(
          `Discount "${appliedDiscount.code}" is no longer available`,
        );
      }

      // Check if discount is still active
      const now = new Date();
      if (
        !discount.isActive ||
        (discount.endDate && new Date(discount.endDate) < now) ||
        new Date(discount.startDate) > now
      ) {
        throw new BadRequestException(
          `Discount "${appliedDiscount.code}" is no longer active`,
        );
      }

      // Check total usage limit with locked row
      if (
        discount.maxUsageTotal &&
        discount.currentUsageCount >= discount.maxUsageTotal
      ) {
        throw new BadRequestException(
          `Discount "${appliedDiscount.code}" has reached its usage limit`,
        );
      }

      // Check per-user usage limit for user-targeted discounts
      if (discount.targetType === DiscountTargetType.USER) {
        const userDiscount = await queryRunner.manager
          .createQueryBuilder(UserDiscount, "userDiscount")
          .where("userDiscount.userId = :userId", { userId })
          .andWhere("userDiscount.discountId = :discountId", {
            discountId: appliedDiscount.discountId,
          })
          .setLock("pessimistic_write")
          .getOne();

        if (!userDiscount) {
          throw new BadRequestException(
            `Discount "${appliedDiscount.code}" is not assigned to your account`,
          );
        }

        if (
          discount.maxUsagePerUser &&
          userDiscount.usageCount >= discount.maxUsagePerUser
        ) {
          throw new BadRequestException(
            `You have reached your usage limit for discount "${appliedDiscount.code}"`,
          );
        }
      }
    }
  }
}
