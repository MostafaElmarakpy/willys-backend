import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Branch } from './branch.entity';
import { Item } from './item.entity';
import { User } from './user.entity';

@Entity('branch_item_overrides')
@Unique(['branchId', 'itemId'])
@Index(['branchId', 'isAvailable'])
export class BranchItemOverride extends BaseEntity {
  @Column()
  @Index()
  branchId: string;

  @ManyToOne(() => Branch, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  @Index()
  itemId: string;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @Column({ nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User;
}
