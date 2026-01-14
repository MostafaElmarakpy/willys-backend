import { PaymentStatus } from "src/common/enums/PaymentStatus";
import { PaymentType } from "src/common/enums/PaymentType";
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { PaymentMethod } from "./payment-method.entity";
import { PaymentTransactionLog } from "./payment-transaction-log.entity";
import { Refund } from "./refund.entity";
import { User } from "./user.entity";

@Entity("payments")
export class Payment extends BaseEntity {
  @Column({ type: "varchar", length: 100, unique: true })
  @Index()
  transactionId: string;

  @Column({ type: "varchar", length: 50, nullable: true, unique: true })
  @Index()
  paymobOrderId?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  merchantOrderId?: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 3, default: "EGP" })
  currency: string;

  @Column({
    type: "enum",
    enum: PaymentType,
  })
  @Index()
  paymentType: PaymentType;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  @Index()
  status: PaymentStatus;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => PaymentMethod, { nullable: true })
  @JoinColumn({ name: "paymentMethodId" })
  paymentMethod?: PaymentMethod;

  @Column({ nullable: true })
  paymentMethodId?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  paymobTransactionId?: string;

  @Column({ type: "text", nullable: true })
  paymobIframeUrl?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  paymobPaymentKey?: string;

  @Column({ type: "jsonb", nullable: true })
  paymobResponse?: Record<string, any>;

  @Column({ type: "varchar", length: 100, nullable: true })
  cashReferenceNumber?: string;

  @Column({ type: "varchar", length: 4, nullable: true })
  cardLastFourDigits?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  cardBrand?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: "text", nullable: true })
  errorMessage?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  errorCode?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  refundedAmount: number;

  @Column({ type: "boolean", default: false })
  isRefundable: boolean;

  @Column({ type: "timestamp", nullable: true })
  paidAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  failedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  refundedAt?: Date;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: "text", nullable: true })
  userAgent?: string;

  @OneToMany(
    () => PaymentTransactionLog,
    (log) => log.payment,
  )
  transactionLogs: PaymentTransactionLog[];

  @OneToMany(
    () => Refund,
    (refund) => refund.payment,
  )
  refunds: Refund[];
}
