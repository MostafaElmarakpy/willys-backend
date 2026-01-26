import { Column, Entity, Index, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { User } from "./user.entity";

@Entity("admin_notification_preferences")
export class AdminNotificationPreferences extends BaseEntity {
  @Column()
  @Index({ unique: true })
  userId: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "boolean", default: true })
  orderNew: boolean;

  @Column({ type: "boolean", default: true })
  orderStatusChanged: boolean;

  @Column({ type: "boolean", default: true })
  userRegistered: boolean;

  @Column({ type: "boolean", default: true })
  paymentSuccess: boolean;

  @Column({ type: "boolean", default: true })
  paymentFailed: boolean;

  @Column({ type: "boolean", default: true })
  paymentRefunded: boolean;

  @Column({ type: "boolean", default: true })
  pushEnabled: boolean;
}
