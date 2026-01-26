import { NotificationType } from "src/common/enums/NotificationType";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { User } from "./user.entity";

@Entity("admin_notifications")
export class AdminNotification extends BaseEntity {
  @Column({
    type: "enum",
    enum: NotificationType,
  })
  @Index()
  type: NotificationType;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({ type: "jsonb", nullable: true })
  data?: Record<string, any>;

  @Column({ type: "boolean", default: false })
  @Index()
  isRead: boolean;

  @Column({ type: "uuid", nullable: true })
  @Index()
  targetUserId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "targetUserId" })
  targetUser?: User;

  @Column({ type: "timestamp", nullable: true })
  readAt?: Date;
}
