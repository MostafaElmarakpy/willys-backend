import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';
import { Item } from './item.entity';
import { Discount } from './discount.entity';
import { User } from './user.entity';

@Entity('item_discounts')
@Index(['itemId', 'discountId'], { unique: true })
export class ItemDiscount {
  @PrimaryColumn('uuid')
  itemId: string;

  @PrimaryColumn('uuid')
  discountId: string;

  @ManyToOne(() => Item, { nullable: false })
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @ManyToOne(() => Discount, (discount) => discount.itemDiscounts, {
    nullable: false,
  })
  @JoinColumn({ name: 'discountId' })
  discount: Discount;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'assignedBy' })
  assignedByUser: User;

  @Column()
  assignedBy: string;
}
