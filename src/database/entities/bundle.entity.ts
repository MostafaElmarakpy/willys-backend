import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { BundleComponent } from './bundle-component.entity';
import { BaseEntity } from './base.entity';
import { BundleStatus } from 'src/common/enums/BundleStatus';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';

@Entity('bundles')
export class Bundle extends BaseEntity {
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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: BundleStatus,
    default: BundleStatus.DRAFT,
  })
  @Index()
  status: BundleStatus;

  @OneToMany(() => BundleComponent, (component) => component.bundle, {
    cascade: true,
  })
  components: BundleComponent[];

  @Column({ type: 'jsonb', nullable: true })
  extras?: Array<{
    id: string;
    quantity: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

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
