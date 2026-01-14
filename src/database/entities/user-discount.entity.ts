import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { Discount } from "./discount.entity";
import { User } from "./user.entity";

@Entity("user_discounts")
@Index(["userId", "discountId"], { unique: true })
export class UserDiscount {
  @PrimaryColumn("uuid")
  userId: string;

  @PrimaryColumn("uuid")
  discountId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(
    () => Discount,
    (discount) => discount.userDiscounts,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: "discountId" })
  discount: Discount;

  @Column({ type: "int", default: 0 })
  usageCount: number;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt?: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  assignedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "assignedBy" })
  assignedByUser: User;

  @Column()
  assignedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
