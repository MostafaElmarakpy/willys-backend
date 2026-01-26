import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { User } from "./user.entity";

@Entity("admin_fcm_tokens")
export class AdminFcmToken extends BaseEntity {
  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 500 })
  @Index()
  token: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  deviceId?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  deviceType?: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  userAgent?: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt?: Date;
}
