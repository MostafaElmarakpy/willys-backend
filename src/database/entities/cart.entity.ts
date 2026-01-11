import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Branch } from './branch.entity';
import { UserAddress } from './user-address.entity';
import { CartItem } from './cart-item.entity';
import { BaseEntity } from './base.entity';
import { OrderType } from 'src/common/enums/OrderType';
import { DiscountType } from 'src/common/enums/DiscountType';

export interface AppliedDiscount {
  discountId: string;
  code?: string;
  type: DiscountType;
  amount: number;
}

export interface CartValidationError {
  itemId: string;
  error: string;
}

@Entity('carts')
export class Cart extends BaseEntity {
  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ unique: true })
  @Index()
  userId: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @Column({ nullable: true })
  @Index()
  branchId?: string;

  @Column({
    type: 'enum',
    enum: OrderType,
    nullable: true,
  })
  orderType?: OrderType;

  @ManyToOne(() => UserAddress, { nullable: true })
  @JoinColumn({ name: 'deliveryAddressId' })
  deliveryAddress?: UserAddress;

  @Column({ nullable: true })
  deliveryAddressId?: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledPickupTime?: Date;

  @Column({ type: 'text', nullable: true })
  specialInstructions?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'jsonb', nullable: true })
  appliedDiscounts?: AppliedDiscount[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, { cascade: true })
  items: CartItem[];

  @Column({ type: 'timestamp', nullable: true })
  lastValidatedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  validationErrors?: CartValidationError[];
}
