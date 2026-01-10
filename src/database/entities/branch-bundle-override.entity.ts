import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Branch } from './branch.entity';
import { Bundle } from './bundle.entity';
import { User } from './user.entity';

@Entity('branch_bundle_overrides')
@Unique(['branchId', 'bundleId'])
@Index(['branchId', 'isAvailable'])
export class BranchBundleOverride extends BaseEntity {
  @Column()
  @Index()
  branchId: string;

  @ManyToOne(() => Branch, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  @Index()
  bundleId: string;

  @ManyToOne(() => Bundle, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bundleId' })
  bundle: Bundle;

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
