import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { OrderStatus } from "src/common/enums/OrderStatus";
import { OrderType } from "src/common/enums/OrderType";
import { Cart } from "src/database/entities/cart.entity";
import {
  type DeliveryAddressSnapshot,
  Order,
} from "src/database/entities/order.entity";
import { OrderItem } from "src/database/entities/order-item.entity";
import { OrderStatusLog } from "src/database/entities/order-status-log.entity";
import { UserAddress } from "src/database/entities/user-address.entity";
import { DataSource, IsNull, type QueryRunner, type Repository } from "typeorm";
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from "../notifications/events/order.events";
import { OrderFilterDto } from "./dto/order-filter.dto";

@Injectable()
export class OrdersService {
  // Status transition rules
  private readonly statusTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.READY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.OUT_FOR_DELIVERY]: [
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.COMPLETED]: [OrderStatus.REFUNDED],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.REFUNDED]: [],
  };

  // Statuses that can be cancelled by user
  private readonly userCancellableStatuses = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
  ];

  // Statuses that require refund on cancellation
  private readonly refundRequiredStatuses = [
    OrderStatus.CONFIRMED,
    OrderStatus.PREPARING,
    OrderStatus.READY,
    OrderStatus.OUT_FOR_DELIVERY,
  ];

  constructor(
    @InjectRepository(Order) readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(OrderStatusLog)
    readonly statusLogRepository: Repository<OrderStatusLog>,
    @InjectRepository(UserAddress)
    readonly addressRepository: Repository<UserAddress>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hour = now.getHours().toString().padStart(2, "0");
    const minute = now.getMinutes().toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    return `WLY-${year}${month}${day}${hour}${minute}-${random}`;
  }

  async createFromCart(
    userId: string,
    cart: Cart,
    paymentId?: string,
    ipAddress?: string,
    userAgent?: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<Order> {
    // Use external query runner if provided, otherwise create our own
    const queryRunner =
      externalQueryRunner || this.dataSource.createQueryRunner();
    const isExternalTransaction = !!externalQueryRunner;

    // Only manage connection and transaction if we created it
    if (!isExternalTransaction) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

    try {
      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Get delivery address snapshot if delivery order
      let deliveryAddressSnapshot: DeliveryAddressSnapshot | undefined;
      let zoneId: string | undefined;

      if (cart.orderType === OrderType.DELIVERY && cart.deliveryAddressId) {
        const address = await this.addressRepository.findOne({
          where: { id: cart.deliveryAddressId },
        });

        if (address) {
          deliveryAddressSnapshot = {
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            city: address.city,
            area: address.area,
            latitude: Number(address.latitude),
            longitude: Number(address.longitude),
            deliveryInstructions: address.deliveryInstructions,
            contactPhone: address.contactPhone,
          };
        }
      }

      // Create order
      const order = queryRunner.manager.create(Order, {
        orderNumber,
        userId,
        branchId: cart.branchId,
        orderType: cart.orderType,
        status: OrderStatus.PENDING,
        deliveryAddressId: cart.deliveryAddressId,
        deliveryAddressSnapshot,
        zoneId,
        scheduledPickupTime: cart.scheduledPickupTime,
        subtotal: cart.subtotal,
        discountAmount: cart.discountAmount,
        deliveryFee: cart.deliveryFee,
        tax: cart.tax,
        total: cart.total,
        appliedDiscounts: cart.appliedDiscounts?.map((d) => ({
          discountId: d.discountId,
          code: d.code,
          name: { en: d.code || "Discount", ar: d.code || "خصم" },
          type: d.type,
          amount: d.amount,
        })),
        paymentId,
        specialInstructions: cart.specialInstructions,
        estimatedPrepTime: 15, // Default prep time
        estimatedDeliveryTime:
          cart.orderType === OrderType.DELIVERY ? 30 : undefined,
        ipAddress,
        userAgent,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items from cart items
      for (const cartItem of cart.items || []) {
        if (cartItem.deletedAt) continue;

        const itemData = cartItem.item || cartItem.bundle;
        const orderItem = queryRunner.manager.create(OrderItem, {
          orderId: savedOrder.id,
          itemType: cartItem.itemType,
          originalItemId: cartItem.itemId || cartItem.bundleId,
          name: itemData?.name || { en: "Unknown", ar: "غير معروف" },
          description: itemData?.description,
          image: itemData?.image,
          quantity: cartItem.quantity,
          unitPrice: cartItem.unitPrice,
          totalPrice: cartItem.totalPrice,
          selectedVariant: cartItem.selectedVariant,
          customizations: cartItem.customizations,
          extras: cartItem.extras,
          specialInstructions: cartItem.specialInstructions,
          discountAmount: cartItem.discountAmount,
          appliedDiscount: cartItem.appliedDiscountId
            ? {
                discountId: cartItem.appliedDiscountId,
                type: "PERCENTAGE" as any,
                amount: Number(cartItem.discountAmount),
              }
            : undefined,
        });

        await queryRunner.manager.save(orderItem);
      }

      // Create initial status log
      const statusLog = queryRunner.manager.create(OrderStatusLog, {
        orderId: savedOrder.id,
        previousStatus: OrderStatus.PENDING,
        newStatus: OrderStatus.PENDING,
        notes: "Order created",
        occurredAt: new Date(),
      });

      await queryRunner.manager.save(statusLog);

      // Only commit if we created the transaction
      if (!isExternalTransaction) {
        await queryRunner.commitTransaction();
        // After commit, fetch with relations
        const completeOrder = await this.findOne(savedOrder.id);

        // Emit order created event (fire-and-forget)
        this.eventEmitter.emit(
          "order.created",
          new OrderCreatedEvent(
            completeOrder.id,
            completeOrder.orderNumber,
            completeOrder.userId,
            completeOrder.user?.fullName || "Customer",
            Number(completeOrder.total),
            completeOrder.branchId,
            completeOrder.branch?.name?.en || "Branch",
            completeOrder.orderType,
          ),
        );

        return completeOrder;
      }

      // If using external transaction, just return the saved order object
      // The caller will fetch it with relations after committing their transaction
      return savedOrder;
    } catch (error) {
      // Only rollback if we created the transaction
      if (!isExternalTransaction) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      // Only release if we created the query runner
      if (!isExternalTransaction) {
        await queryRunner.release();
      }
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ["items", "statusLogs", "branch", "user"],
      order: {
        statusLogs: { occurredAt: "ASC" },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber, deletedAt: IsNull() },
      relations: ["items", "statusLogs", "branch"],
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }

  async findByUser(
    userId: string,
    filterDto: OrderFilterDto,
  ): Promise<{ orders: Order[]; total: number }> {
    const {
      status,
      orderType,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder,
    } = filterDto;

    const queryBuilder = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("order.branch", "branch")
      .where("order.userId = :userId", { userId })
      .andWhere("order.deletedAt IS NULL");

    if (status) {
      queryBuilder.andWhere("order.status = :status", { status });
    }

    if (orderType) {
      queryBuilder.andWhere("order.orderType = :orderType", { orderType });
    }

    if (startDate) {
      queryBuilder.andWhere("order.createdAt >= :startDate", {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere("order.createdAt <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    queryBuilder.orderBy(`order.${sortBy || "createdAt"}`, sortOrder || "DESC");
    const pageNum = page || 1;
    const limitNum = limit || 10;
    queryBuilder.skip((pageNum - 1) * limitNum).take(limitNum);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return { orders, total };
  }

  async findAll(
    filterDto: OrderFilterDto,
  ): Promise<{ orders: Order[]; total: number }> {
    const {
      status,
      orderType,
      branchId,
      startDate,
      endDate,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    } = filterDto;

    const queryBuilder = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("order.branch", "branch")
      .leftJoinAndSelect("order.user", "user")
      .where("order.deletedAt IS NULL");

    if (status) {
      queryBuilder.andWhere("order.status = :status", { status });
    }

    if (orderType) {
      queryBuilder.andWhere("order.orderType = :orderType", { orderType });
    }

    if (branchId) {
      queryBuilder.andWhere("order.branchId = :branchId", { branchId });
    }

    if (startDate) {
      queryBuilder.andWhere("order.createdAt >= :startDate", {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere("order.createdAt <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    if (search) {
      queryBuilder.andWhere(
        "(order.orderNumber ILIKE :search OR user.email ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy(`order.${sortBy || "createdAt"}`, sortOrder || "DESC");
    const pageNum = page || 1;
    const limitNum = limit || 10;
    queryBuilder.skip((pageNum - 1) * limitNum).take(limitNum);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return { orders, total };
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId?: string,
    notes?: string,
    ipAddress?: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId);
    const previousStatus = order.status;

    // Validate status transition
    const allowedTransitions = this.statusTransitions[previousStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${previousStatus} to ${newStatus}`,
      );
    }

    // Update order status and timestamps
    order.status = newStatus;

    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = new Date();
        break;
      case OrderStatus.PREPARING:
        order.preparingAt = new Date();
        break;
      case OrderStatus.READY:
        order.readyAt = new Date();
        break;
      case OrderStatus.OUT_FOR_DELIVERY:
        order.outForDeliveryAt = new Date();
        break;
      case OrderStatus.COMPLETED:
        order.completedAt = new Date();
        if (order.orderType === OrderType.PICKUP) {
          order.actualPickupTime = new Date();
        }
        break;
      case OrderStatus.CANCELLED:
        order.cancelledAt = new Date();
        order.cancelledById = userId;
        break;
    }

    await this.orderRepository.save(order);

    // Create status log
    const statusLog = this.statusLogRepository.create({
      orderId,
      previousStatus,
      newStatus,
      notes,
      changedById: userId,
      ipAddress,
      occurredAt: new Date(),
    });

    await this.statusLogRepository.save(statusLog);

    const updatedOrder = await this.findOne(orderId);

    // Emit order status changed event (fire-and-forget)
    this.eventEmitter.emit(
      "order.status.changed",
      new OrderStatusChangedEvent(
        updatedOrder.id,
        updatedOrder.orderNumber,
        previousStatus,
        newStatus,
        updatedOrder.user?.fullName || "Customer",
      ),
    );

    return updatedOrder;
  }

  async cancelOrder(
    orderId: string,
    userId: string,
    reason: string,
    isAdmin: boolean = false,
    ipAddress?: string,
  ): Promise<Order> {
    const order = await this.findOne(orderId);

    // Check if user can cancel
    if (!isAdmin) {
      if (order.userId !== userId) {
        throw new BadRequestException("You can only cancel your own orders");
      }

      if (!this.userCancellableStatuses.includes(order.status)) {
        throw new BadRequestException(
          "This order can no longer be cancelled. Please contact support.",
        );
      }
    }

    // Check if status allows cancellation
    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException("This order cannot be cancelled");
    }

    order.cancellationReason = reason;

    return this.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
      userId,
      reason,
      ipAddress,
    );
  }

  async linkPayment(orderId: string, paymentId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    order.paymentId = paymentId;
    await this.orderRepository.save(order);
    return order;
  }

  async confirmOrder(orderId: string, userId?: string): Promise<Order> {
    return this.updateStatus(orderId, OrderStatus.CONFIRMED, userId);
  }

  async getOrderStats(branchId?: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder("order")
      .where("order.deletedAt IS NULL");

    if (branchId) {
      queryBuilder.andWhere("order.branchId = :branchId", { branchId });
    }

    const totalOrders = await queryBuilder.getCount();

    const pendingOrders = await queryBuilder
      .clone()
      .andWhere("order.status IN (:...statuses)", {
        statuses: [
          OrderStatus.PENDING,
          OrderStatus.CONFIRMED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.OUT_FOR_DELIVERY,
        ],
      })
      .getCount();

    const completedOrders = await queryBuilder
      .clone()
      .andWhere("order.status = :status", { status: OrderStatus.COMPLETED })
      .getCount();

    const cancelledOrders = await queryBuilder
      .clone()
      .andWhere("order.status = :status", { status: OrderStatus.CANCELLED })
      .getCount();

    const revenueResult = await queryBuilder
      .clone()
      .andWhere("order.status = :status", { status: OrderStatus.COMPLETED })
      .select("SUM(order.total)", "total")
      .getRawOne();

    const totalRevenue = Number(revenueResult?.total) || 0;
    const averageOrderValue =
      completedOrders > 0 ? totalRevenue / completedOrders : 0;

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue,
    };
  }

  async requiresRefund(orderId: string): Promise<boolean> {
    const order = await this.findOne(orderId);
    return this.refundRequiredStatuses.includes(order.status);
  }
}
