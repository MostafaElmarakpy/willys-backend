import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';
import { Category } from './category.entity';
import { BundleStatus } from 'src/common/enums/BundleStatus';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';

@Entity('bundles')
export class Bundle {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @Column({ type: 'json' })
  name: BilingualStringObject;

  @Column({ type: 'json', nullable: true })
  description?: BilingualStringObject;

  @Column({ nullable: true })
  image?: string;

  @ManyToOne(() => Category, (category) => category.bundles, {
    nullable: false,
  })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  @Index()
  categoryId: string;

  @Column({ type: 'int' })
  numberOfItems: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: BundleStatus,
    default: BundleStatus.DRAFT,
  })
  @Index()
  status: BundleStatus;

  @Column({ type: 'jsonb', nullable: true })
  items?: Array<{
    id: string;
    quantity: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  extras?: Array<{
    id: string;
    quantity: string;
  }>;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
