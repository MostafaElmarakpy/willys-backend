import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Payment } from "./payment.entity";
import { User } from "./user.entity";

@Entity("payment_methods")
export class PaymentMethod extends BaseEntity {
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  @Index()
  userId: string;

  @Column({ type: "varchar", length: 500 })
  paymobToken: string;

  @Column({ type: "varchar", length: 4 })
  cardLastFourDigits: string;

  @Column({ type: "varchar", length: 50 })
  cardBrand: string;

  @Column({ type: "varchar", length: 7, nullable: true })
  expiryMonth?: string;

  @Column({ type: "varchar", length: 4, nullable: true })
  expiryYear?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  cardHolderName?: string;

  @Column({ type: "boolean", default: false })
  isDefault: boolean;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  nickname?: string;

  @OneToMany(
    () => Payment,
    (payment) => payment.paymentMethod,
  )
  payments: Payment[];
}
