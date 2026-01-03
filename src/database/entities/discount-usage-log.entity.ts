import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Discount } from './discount.entity';
import { User } from './user.entity';
import { Item } from './item.entity';
import { BaseEntity } from './base.entity';

@Entity('discount_usage_logs')
export class DiscountUsageLog extends BaseEntity {

  @ManyToOne(() => Discount, (discount) => discount.usageLogs, {
    nullable: false,
  })
  @JoinColumn({ name: 'discountId' })
  discount: Discount;

  @Column()
  @Index()
  discountId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  userId: string;

  @Column({ nullable: true })
  orderId?: string;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: 'itemId' })
  item?: Item;

  @Column({ nullable: true })
  itemId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  discountAmount: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  usedAt: Date;
}
