import { OrderStatus } from "../../src/common/enums/OrderStatus";
import { OrderType } from "../../src/common/enums/OrderType";
import { PaymentMethod } from "../../src/common/enums/PaymentMethod";
import { Branch } from "../../src/database/entities/branch.entity";
import { Cart } from "../../src/database/entities/cart.entity";
import { CartItem } from "../../src/database/entities/cart-item.entity";
import { Order } from "../../src/database/entities/order.entity";
import { OrderItem } from "../../src/database/entities/order-item.entity";
import { OrderStatusLog } from "../../src/database/entities/order-status-log.entity";
import { User } from "../../src/database/entities/user.entity";
import { UserAddress } from "../../src/database/entities/user-address.entity";
import { Zone } from "../../src/database/entities/zone.entity";
import { getRepository } from "../setup/test-app";

export interface CreateOrderOptions {
  branch?: Branch;
  orderType?: OrderType;
  deliveryAddress?: UserAddress;
  zone?: Zone;
  scheduledPickupTime?: Date;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  subtotal?: number;
  discountAmount?: number;
  deliveryFee?: number;
  tax?: number;
  total?: number;
}

/**
 * Generate a unique order number
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `WO${timestamp}${random}`;
}

/**
 * Create an order from a cart
 */
export async function createOrderFromCart(
  cart: Cart,
  user: User,
  branch: Branch,
  options: CreateOrderOptions = {},
): Promise<Order> {
  const orderRepo = getRepository<Order>(Order);
  const orderItemRepo = getRepository<OrderItem>(OrderItem);
  const cartItemRepo = getRepository<CartItem>(CartItem);

  // Get cart items
  const cartItems = await cartItemRepo.find({
    where: { cartId: cart.id },
    relations: ["item", "bundle"],
  });

  // Create order
  const order = orderRepo.create({
    orderNumber: generateOrderNumber(),
    user,
    userId: user.id,
    branch: options.branch || branch,
    branchId: options.branch?.id || branch.id,
    orderType: options.orderType || cart.orderType || OrderType.DELIVERY,
    status: options.status || OrderStatus.PENDING,
    deliveryAddress: options.deliveryAddress || cart.deliveryAddress,
    deliveryAddressId: options.deliveryAddress?.id || cart.deliveryAddressId,
    zone: options.zone,
    zoneId: options.zone?.id,
    scheduledPickupTime:
      options.scheduledPickupTime || cart.scheduledPickupTime,
    subtotal: options.subtotal || cart.subtotal,
    discountAmount: options.discountAmount || cart.discountAmount,
    deliveryFee: options.deliveryFee || cart.deliveryFee,
    tax: options.tax || cart.tax || 0,
    total: options.total || cart.total,
    currency: "EGP",
    paymentMethod: options.paymentMethod || PaymentMethod.CASH,
    estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes
  });

  const savedOrder = await orderRepo.save(order);

  // Create order items from cart items
  for (const cartItem of cartItems) {
    const orderItem = orderItemRepo.create({
      order: savedOrder,
      orderId: savedOrder.id,
      itemType: cartItem.itemType,
      item: cartItem.item,
      itemId: cartItem.itemId,
      bundle: cartItem.bundle,
      bundleId: cartItem.bundleId,
      quantity: cartItem.quantity,
      unitPrice: cartItem.unitPrice,
      totalPrice: cartItem.totalPrice,
      selectedVariant: cartItem.selectedVariant,
      customizations: cartItem.customizations,
      extras: cartItem.extras,
      specialInstructions: cartItem.specialInstructions,
      discountAmount: cartItem.discountAmount,
      appliedDiscountId: cartItem.appliedDiscountId,
    });

    await orderItemRepo.save(orderItem);
  }

  // Create initial status log
  await createOrderStatusLog(savedOrder, OrderStatus.PENDING, user);

  return savedOrder;
}

/**
 * Create an order directly (without cart)
 */
export async function createOrder(
  user: User,
  branch: Branch,
  options: CreateOrderOptions = {},
): Promise<Order> {
  const orderRepo = getRepository<Order>(Order);

  const order = orderRepo.create({
    orderNumber: generateOrderNumber(),
    user,
    userId: user.id,
    branch: options.branch || branch,
    branchId: options.branch?.id || branch.id,
    orderType: options.orderType || OrderType.DELIVERY,
    status: options.status || OrderStatus.PENDING,
    deliveryAddress: options.deliveryAddress,
    deliveryAddressId: options.deliveryAddress?.id,
    zone: options.zone,
    zoneId: options.zone?.id,
    scheduledPickupTime: options.scheduledPickupTime,
    subtotal: options.subtotal || 100,
    discountAmount: options.discountAmount || 0,
    deliveryFee: options.deliveryFee || 20,
    tax: options.tax || 0,
    total: options.total || 120,
    currency: "EGP",
    paymentMethod: options.paymentMethod || PaymentMethod.CASH,
    estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
  });

  const savedOrder = await orderRepo.save(order);

  // Create initial status log
  await createOrderStatusLog(
    savedOrder,
    options.status || OrderStatus.PENDING,
    user,
  );

  return savedOrder;
}

/**
 * Create an order status log entry
 */
export async function createOrderStatusLog(
  order: Order,
  status: OrderStatus,
  changedBy?: User,
  notes?: string,
): Promise<OrderStatusLog> {
  const orderStatusLogRepo = getRepository<OrderStatusLog>(OrderStatusLog);

  const log = orderStatusLogRepo.create({
    order,
    orderId: order.id,
    status,
    changedBy: changedBy?.id,
    changedByUser: changedBy,
    notes,
    timestamp: new Date(),
  });

  return orderStatusLogRepo.save(log);
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  order: Order,
  newStatus: OrderStatus,
  changedBy?: User,
  notes?: string,
): Promise<Order> {
  const orderRepo = getRepository<Order>(Order);

  order.status = newStatus;
  const updatedOrder = await orderRepo.save(order);

  // Create status log
  await createOrderStatusLog(updatedOrder, newStatus, changedBy, notes);

  return updatedOrder;
}

/**
 * Create multiple orders for a user
 */
export async function createOrders(
  user: User,
  branch: Branch,
  count: number,
  options: CreateOrderOptions = {},
): Promise<Order[]> {
  const orders: Order[] = [];

  for (let i = 0; i < count; i++) {
    const order = await createOrder(user, branch, options);
    orders.push(order);
  }

  return orders;
}

/**
 * Create orders with different statuses
 */
export async function createOrdersWithStatuses(
  user: User,
  branch: Branch,
  statuses: OrderStatus[],
): Promise<Order[]> {
  const orders: Order[] = [];

  for (const status of statuses) {
    const order = await createOrder(user, branch, { status });
    orders.push(order);
  }

  return orders;
}
