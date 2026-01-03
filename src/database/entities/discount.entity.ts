import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Item } from './item.entity';
import { BaseEntity } from './base.entity';
import { DiscountType } from 'src/common/enums/DiscountType';
import { DiscountStatus } from 'src/common/enums/DiscountStatus';
import { DiscountTargetType } from 'src/common/enums/DiscountTargetType';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';
import { UserDiscount } from './user-discount.entity';
import { ItemDiscount } from './item-discount.entity';
import { DiscountUsageLog } from './discount-usage-log.entity';

@Entity('discounts')
export class Discount extends BaseEntity {

  @Column({ nullable: true, unique: true })
  code?: string;

  @Column({ type: 'json' })
  name: BilingualStringObject;

  @Column({ type: 'json', nullable: true })
  description?: BilingualStringObject;

  @Column({
    type: 'enum',
    enum: DiscountType,
  })
  @Index()
  type: DiscountType;

  @Column({
    type: 'enum',
    enum: DiscountTargetType,
  })
  @Index()
  targetType: DiscountTargetType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'int', nullable: true })
  buyQuantity?: number;

  @Column({ type: 'int', nullable: true })
  getQuantity?: number;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: 'freeItemId' })
  freeItem?: Item;

  @Column({ nullable: true })
  freeItemId?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumPurchase?: number;

  @Column({ type: 'int', nullable: true })
  maxUsageTotal?: number;

  @Column({ type: 'int', nullable: true })
  maxUsagePerUser?: number;

  @Column({ type: 'int', default: 0 })
  currentUsageCount: number;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({
    type: 'enum',
    enum: DiscountStatus,
    default: DiscountStatus.SCHEDULED,
  })
  @Index()
  status: DiscountStatus;

  @Column({ type: 'boolean', default: false })
  @Index()
  isActive: boolean;

  @OneToMany(() => UserDiscount, (userDiscount) => userDiscount.discount)
  userDiscounts: UserDiscount[];

  @OneToMany(() => ItemDiscount, (itemDiscount) => itemDiscount.discount)
  itemDiscounts: ItemDiscount[];

  @OneToMany(() => DiscountUsageLog, (log) => log.discount)
  usageLogs: DiscountUsageLog[];

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @Column()
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser?: User;

  @Column({ nullable: true })
  updatedBy?: string;

}
