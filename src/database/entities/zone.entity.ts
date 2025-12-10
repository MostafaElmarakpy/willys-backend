import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Branch } from './branch.entity';
import { User } from './user.entity';
import { BilingualStringObject } from '../../common/dto/bilingual-string.dto';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', nullable: true })
  name?: BilingualStringObject;

  @Column({ type: 'uuid' })
  branchId: string;

  @ManyToOne(() => Branch, (branch) => branch.zones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  // Store polygon using PostGIS geometry type
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Polygon',
    srid: 4326, // WGS84 coordinate system
  })
  @Index({ spatial: true })
  polygon: string; // Well-Known Text (WKT) representation

  // Alternative radius-based zone (optional)
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  centerLatitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  centerLongitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  radiusKm: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number; // For overlapping zones, higher priority wins

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