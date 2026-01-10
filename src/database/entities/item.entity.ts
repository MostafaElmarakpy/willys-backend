import {
  Column,
  Entity,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { Ingredient } from './ingredient.entity';
import { BaseEntity } from './base.entity';
import { ItemStatus } from 'src/common/enums/ItemStatus';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';

@Entity('items')
export class Item extends BaseEntity {
  @Column({ type: 'json' })
  name: BilingualStringObject;

  @Column({ type: 'json', nullable: true })
  description?: BilingualStringObject;

  @Column({ nullable: true })
  image?: string;

  @Column({ type: 'jsonb' })
  pricing:
    | number
    | {
        price?: string;
        variants: Array<{
          name: string;
          sortOrder?: number;
          values: Array<{
            value: string;
            price: string;
            sortOrder?: number;
          }>;
        }>;
        type: 'number' | 'object';
      };

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  extras?: Array<{
    id: string;
    quantity: string;
  }>;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.DRAFT,
  })
  @Index()
  status: ItemStatus;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToOne(() => Category, (category) => category.items, { nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column()
  @Index()
  categoryId: string;

  @ManyToMany(() => Ingredient, { cascade: true })
  @JoinTable({
    name: 'item_ingredients',
    joinColumn: { name: 'itemId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'ingredientId', referencedColumnName: 'id' },
  })
  ingredients: Ingredient[];

  @Column({ type: 'jsonb', nullable: true })
  ingredientsWithQuantity?: Array<{
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
}
