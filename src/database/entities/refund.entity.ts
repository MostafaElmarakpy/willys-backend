import { RefundStatus } from "src/common/enums/RefundStatus";
import { RefundType } from "src/common/enums/RefundType";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Payment } from "./payment.entity";
import { User } from "./user.entity";

@Entity("refunds")
export class Refund extends BaseEntity {
  @ManyToOne(
    () => Payment,
    (payment) => payment.refunds,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: "paymentId" })
  payment: Payment;

  @Column()
  @Index()
  paymentId: string;

  @Column({ type: "varchar", length: 100, unique: true })
  @Index()
  refundId: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: "enum",
    enum: RefundType,
  })
  @Index()
  refundType: RefundType;

  @Column({
    type: "enum",
    enum: RefundStatus,
    default: RefundStatus.PENDING,
  })
  @Index()
  status: RefundStatus;

  @Column({ type: "text" })
  reason: string;

  @Column({ type: "text", nullable: true })
  adminNotes?: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "requestedById" })
  requestedBy: User;

  @Column()
  requestedById: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  requestedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "approvedById" })
  approvedBy?: User;

  @Column({ nullable: true })
  approvedById?: string;

  @Column({ type: "timestamp", nullable: true })
  approvedAt?: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  paymobRefundId?: string;

  @Column({ type: "jsonb", nullable: true })
  paymobResponse?: Record<string, any>;

  @Column({ type: "text", nullable: true })
  errorMessage?: string;

  @Column({ type: "timestamp", nullable: true })
  processedAt?: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt?: Date;

  @Column({ type: "boolean", default: false })
  isAutomatic: boolean;
}
