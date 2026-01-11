import {
  Order,
  OrderAppliedDiscount,
} from 'src/database/entities/order.entity';
import { OrderItem } from 'src/database/entities/order-item.entity';
import { OrderStatusLog } from 'src/database/entities/order-status-log.entity';
import { OrderType } from 'src/common/enums/OrderType';
import { OrderStatus } from 'src/common/enums/OrderStatus';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';

export class OrderItemResponseDto {
  id: string;
  itemType: 'ITEM' | 'BUNDLE';
  originalItemId: string;
  name: BilingualStringObject;
  description?: BilingualStringObject;
  image?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariant?: {
    name: string;
    value: string;
    price: number;
  };
  customizations?: Array<{
    ingredientId: string;
    name: BilingualStringObject;
    action: 'ADD' | 'REMOVE' | 'EXTRA';
    price: number;
  }>;
  extras?: Array<{
    ingredientId: string;
    name: BilingualStringObject;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  specialInstructions?: string;
  discountAmount: number;

  constructor(orderItem: OrderItem) {
    this.id = orderItem.id;
    this.itemType = orderItem.itemType;
    this.originalItemId = orderItem.originalItemId;
    this.name = orderItem.name;
    this.description = orderItem.description;
    this.image = orderItem.image;
    this.quantity = orderItem.quantity;
    this.unitPrice = Number(orderItem.unitPrice);
    this.totalPrice = Number(orderItem.totalPrice);
    this.selectedVariant = orderItem.selectedVariant;
    this.customizations = orderItem.customizations;
    this.extras = orderItem.extras;
    this.specialInstructions = orderItem.specialInstructions;
    this.discountAmount = Number(orderItem.discountAmount);
  }
}

export class OrderStatusLogResponseDto {
  id: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  notes?: string;
  changedById?: string;
  occurredAt: Date;

  constructor(log: OrderStatusLog) {
    this.id = log.id;
    this.previousStatus = log.previousStatus;
    this.newStatus = log.newStatus;
    this.notes = log.notes;
    this.changedById = log.changedById;
    this.occurredAt = log.occurredAt;
  }
}

export class OrderResponseDto {
  id: string;
  orderNumber: string;
  userId: string;
  branchId: string;
  branchName?: BilingualStringObject;
  orderType: OrderType;
  status: OrderStatus;
  deliveryAddressId?: string;
  deliveryAddressSnapshot?: {
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    area?: string;
    latitude: number;
    longitude: number;
    deliveryInstructions?: string;
    contactPhone?: string;
  };
  zoneId?: string;
  scheduledPickupTime?: Date;
  actualPickupTime?: Date;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  currency: string;
  appliedDiscounts?: OrderAppliedDiscount[];
  paymentId?: string;
  specialInstructions?: string;
  estimatedPrepTime?: number;
  estimatedDeliveryTime?: number;
  confirmedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  outForDeliveryAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  items: OrderItemResponseDto[];
  statusLogs?: OrderStatusLogResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  constructor(order: Order & { branch?: any }) {
    this.id = order.id;
    this.orderNumber = order.orderNumber;
    this.userId = order.userId;
    this.branchId = order.branchId;
    this.branchName = order.branch?.name;
    this.orderType = order.orderType;
    this.status = order.status;
    this.deliveryAddressId = order.deliveryAddressId;
    this.deliveryAddressSnapshot = order.deliveryAddressSnapshot;
    this.zoneId = order.zoneId;
    this.scheduledPickupTime = order.scheduledPickupTime;
    this.actualPickupTime = order.actualPickupTime;
    this.subtotal = Number(order.subtotal);
    this.discountAmount = Number(order.discountAmount);
    this.deliveryFee = Number(order.deliveryFee);
    this.tax = Number(order.tax);
    this.total = Number(order.total);
    this.currency = order.currency;
    this.appliedDiscounts = order.appliedDiscounts;
    this.paymentId = order.paymentId;
    this.specialInstructions = order.specialInstructions;
    this.estimatedPrepTime = order.estimatedPrepTime;
    this.estimatedDeliveryTime = order.estimatedDeliveryTime;
    this.confirmedAt = order.confirmedAt;
    this.preparingAt = order.preparingAt;
    this.readyAt = order.readyAt;
    this.outForDeliveryAt = order.outForDeliveryAt;
    this.completedAt = order.completedAt;
    this.cancelledAt = order.cancelledAt;
    this.cancellationReason = order.cancellationReason;
    this.items =
      order.items?.map((item) => new OrderItemResponseDto(item)) || [];
    this.statusLogs =
      order.statusLogs?.map((log) => new OrderStatusLogResponseDto(log)) || [];
    this.createdAt = order.createdAt;
    this.updatedAt = order.updatedAt;
  }
}

export class OrderListResponseDto {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  branchName?: BilingualStringObject;
  itemCount: number;
  total: number;
  currency: string;
  createdAt: Date;

  constructor(order: Order & { branch?: any }) {
    this.id = order.id;
    this.orderNumber = order.orderNumber;
    this.orderType = order.orderType;
    this.status = order.status;
    this.branchName = order.branch?.name;
    this.itemCount = order.items?.length || 0;
    this.total = Number(order.total);
    this.currency = order.currency;
    this.createdAt = order.createdAt;
  }
}
