import { OrderStatus } from "../../src/common/enums/OrderStatus";
import { OrderType } from "../../src/common/enums/OrderType";
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
    estimatedDeliveryTime: 45, // 45 minutes
  });

  const savedOrder = await orderRepo.save(order);

  // Create order items from cart items
  for (const cartItem of cartItems) {
    const itemName = cartItem.item?.name ||
      cartItem.bundle?.name || { en: "Item", ar: "عنصر" };
    const orderItem = orderItemRepo.create({
      order: savedOrder,
      orderId: savedOrder.id,
      itemType: cartItem.itemType,
      originalItemId: cartItem.itemId || cartItem.bundleId || "",
      name: itemName,
      quantity: cartItem.quantity,
      unitPrice: cartItem.unitPrice,
      totalPrice: cartItem.totalPrice,
      selectedVariant: cartItem.selectedVariant,
      customizations: cartItem.customizations,
      extras: cartItem.extras,
      specialInstructions: cartItem.specialInstructions,
      discountAmount: cartItem.discountAmount || 0,
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
    estimatedDeliveryTime: 45, // 45 minutes
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
  previousStatus?: OrderStatus,
): Promise<OrderStatusLog> {
  const orderStatusLogRepo = getRepository<OrderStatusLog>(OrderStatusLog);

  const log = orderStatusLogRepo.create({
    order,
    orderId: order.id,
    previousStatus: previousStatus || OrderStatus.PENDING,
    newStatus: status,
    changedById: changedBy?.id,
    changedBy: changedBy,
    notes,
    occurredAt: new Date(),
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

export interface CreateOrderItemOptions {
  itemType?: "ITEM" | "BUNDLE";
  originalItemId?: string;
  name?: { en: string; ar: string };
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  discountAmount?: number;
}

/**
 * Create an order item directly
 */
export async function createOrderItem(
  order: Order,
  options: CreateOrderItemOptions = {},
): Promise<OrderItem> {
  const orderItemRepo = getRepository<OrderItem>(OrderItem);

  const quantity = options.quantity || 1;
  const unitPrice = options.unitPrice || 50;
  const totalPrice = options.totalPrice || quantity * unitPrice;

  const orderItem = orderItemRepo.create({
    order,
    orderId: order.id,
    itemType: options.itemType || "ITEM",
    originalItemId: options.originalItemId || "item-id-placeholder",
    name: options.name || { en: "Test Item", ar: "عنصر اختبار" },
    quantity,
    unitPrice,
    totalPrice,
    discountAmount: options.discountAmount || 0,
  });

  return orderItemRepo.save(orderItem);
}
