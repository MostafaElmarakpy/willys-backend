import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Zone } from './zone.entity';
import { User } from './user.entity';
import { BilingualStringObject } from '../../common/dto/bilingual-string.dto';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  name: BilingualStringObject;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  @Index()
  longitude: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isOpen: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  openingHours: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  closingHours: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  deliveryFee: number;

  @Column({ type: 'int', nullable: true })
  estimatedDeliveryTime: number; // in minutes

  @OneToMany(() => Zone, (zone) => zone.branch, { cascade: true })
  zones: Zone[];

  @Column({ nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @Column({ nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}