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
import { IngredientCategory } from './ingredient-category.entity';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';

@Entity('ingredients')
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @Column({ type: 'json' })
  name: BilingualStringObject;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ default: false })
  @Index()
  isOptional: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, comment: 'Stock percentage (0-100)' })
  stockPercentage: number;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @ManyToOne(() => IngredientCategory, (category) => category.ingredients, { nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category: IngredientCategory;

  @Column()
  categoryId: string;

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