import { OrderStatus } from "src/common/enums/OrderStatus";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Order } from "./order.entity";
import { User } from "./user.entity";

@Entity("order_status_logs")
export class OrderStatusLog extends BaseEntity {
  @ManyToOne(
    () => Order,
    (order) => order.statusLogs,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "orderId" })
  order: Order;

  @Column()
  @Index()
  orderId: string;

  @Column({
    type: "enum",
    enum: OrderStatus,
  })
  previousStatus: OrderStatus;

  @Column({
    type: "enum",
    enum: OrderStatus,
  })
  newStatus: OrderStatus;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "changedById" })
  changedBy?: User;

  @Column({ nullable: true })
  changedById?: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  @Index()
  occurredAt: Date;
}
