import { PaymentEventType } from "src/common/enums/PaymentEventType";
import { PaymentStatus } from "src/common/enums/PaymentStatus";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Payment } from "./payment.entity";

@Entity("payment_transaction_logs")
export class PaymentTransactionLog extends BaseEntity {
  @ManyToOne(
    () => Payment,
    (payment) => payment.transactionLogs,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: "paymentId" })
  payment: Payment;

  @Column()
  @Index()
  paymentId: string;

  @Column({
    type: "enum",
    enum: PaymentEventType,
  })
  @Index()
  eventType: PaymentEventType;

  @Column({
    type: "enum",
    enum: PaymentStatus,
  })
  previousStatus: PaymentStatus;

  @Column({
    type: "enum",
    enum: PaymentStatus,
  })
  newStatus: PaymentStatus;

  @Column({ type: "jsonb", nullable: true })
  eventData?: Record<string, any>;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  @Index()
  occurredAt: Date;
}
