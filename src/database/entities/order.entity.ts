import { BilingualStringObject } from "src/common/dto/bilingual-string.dto";
import { DiscountType } from "src/common/enums/DiscountType";
import { OrderStatus } from "src/common/enums/OrderStatus";
import { OrderType } from "src/common/enums/OrderType";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Branch } from "./branch.entity";
import { OrderItem } from "./order-item.entity";
import { OrderStatusLog } from "./order-status-log.entity";
import { Payment } from "./payment.entity";
import { User } from "./user.entity";
import { UserAddress } from "./user-address.entity";
import { Zone } from "./zone.entity";

export interface OrderAppliedDiscount {
  discountId: string;
  code?: string;
  name: BilingualStringObject;
  type: DiscountType;
  amount: number;
}

export interface DeliveryAddressSnapshot {
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  area?: string;
  latitude: number;
  longitude: number;
  deliveryInstructions?: string;
  contactPhone?: string;
}

@Entity("orders")
export class Order extends BaseEntity {
  @Column({ type: "varchar", length: 20, unique: true })
  @Index()
  orderNumber: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => Branch, { nullable: false })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column()
  @Index()
  branchId: string;

  @Column({
    type: "enum",
    enum: OrderType,
  })
  @Index()
  orderType: OrderType;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  @Index()
  status: OrderStatus;

  // Delivery-specific fields
  @ManyToOne(() => UserAddress, { nullable: true })
  @JoinColumn({ name: "deliveryAddressId" })
  deliveryAddress?: UserAddress;

  @Column({ nullable: true })
  deliveryAddressId?: string;

  @Column({ type: "jsonb", nullable: true })
  deliveryAddressSnapshot?: DeliveryAddressSnapshot;

  @ManyToOne(() => Zone, { nullable: true })
  @JoinColumn({ name: "zoneId" })
  zone?: Zone;

  @Column({ nullable: true })
  zoneId?: string;

  // Pickup-specific fields
  @Column({ type: "timestamp", nullable: true })
  scheduledPickupTime?: Date;

  @Column({ type: "timestamp", nullable: true })
  actualPickupTime?: Date;

  // Order totals (snapshot at time of order)
  @Column({ type: "decimal", precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total: number;

  @Column({ type: "varchar", length: 3, default: "EGP" })
  currency: string;

  // Applied discounts snapshot
  @Column({ type: "jsonb", nullable: true })
  appliedDiscounts?: OrderAppliedDiscount[];

  // Payment link
  @ManyToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: "paymentId" })
  payment?: Payment;

  @Column({ nullable: true })
  @Index()
  paymentId?: string;

  @Column({ type: "text", nullable: true })
  specialInstructions?: string;

  // Timing
  @Column({ type: "int", nullable: true })
  estimatedPrepTime?: number;

  @Column({ type: "int", nullable: true })
  estimatedDeliveryTime?: number;

  @Column({ type: "timestamp", nullable: true })
  confirmedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  preparingAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  readyAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  outForDeliveryAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  cancelledAt?: Date;

  @Column({ type: "text", nullable: true })
  cancellationReason?: string;

  @Column({ nullable: true })
  cancelledById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "cancelledById" })
  cancelledBy?: User;

  // Relations
  @OneToMany(
    () => OrderItem,
    (orderItem) => orderItem.order,
    { cascade: true },
  )
  items: OrderItem[];

  @OneToMany(
    () => OrderStatusLog,
    (log) => log.order,
  )
  statusLogs: OrderStatusLog[];

  // Metadata
  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: "text", nullable: true })
  userAgent?: string;

  // Index for date range queries
  @Index()
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  declare createdAt: Date;
}
