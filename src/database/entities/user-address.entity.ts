import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';
import { AddressType } from 'src/common/enums/AddressType';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';

@Entity('user_addresses')
export class UserAddress extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  userId: string;

  @Column({ type: 'jsonb' })
  label: BilingualStringObject;

  @Column({
    type: 'enum',
    enum: AddressType,
    default: AddressType.HOME,
  })
  type: AddressType;

  @Column({ type: 'text' })
  addressLine1: string;

  @Column({ type: 'text', nullable: true })
  addressLine2?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  area?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postalCode?: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  @Index()
  longitude: number;

  @Column({ type: 'text', nullable: true })
  deliveryInstructions?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone?: string;

  @Column({ type: 'boolean', default: false })
  @Index()
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Cached zone/branch info for quick lookup
  @Column({ nullable: true })
  cachedBranchId?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  cachedDeliveryFee?: number;

  @Column({ type: 'timestamp', nullable: true })
  lastValidatedAt?: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async ensureSingleDefault() {
    // This will be handled in the service to avoid circular issues
  }
}
