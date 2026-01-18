import { BilingualStringObject } from "src/common/dto/bilingual-string.dto";
import { QuantityType } from "src/common/enums/QuantityType";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { IngredientCategory } from "./ingredient-category.entity";
import { User } from "./user.entity";

@Entity("ingredients")
export class Ingredient extends BaseEntity {
  @Column({ type: "json" })
  name: BilingualStringObject;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  quantity: number;

  @Column({
    type: "enum",
    enum: QuantityType,
    default: QuantityType.PIECE,
  })
  @Index()
  quantityType: QuantityType;

  @Column({ default: false })
  @Index()
  isOptional: boolean;

  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    comment: "Stock percentage (0-100)",
  })
  stockPercentage: number;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ default: false })
  @Index()
  isDefaultExtra: boolean;

  @ManyToOne(
    () => IngredientCategory,
    (category) => category.ingredients,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: "categoryId" })
  category: IngredientCategory;

  @Column()
  @Index()
  categoryId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "createdBy" })
  createdByUser: User;

  @Column()
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updatedBy" })
  updatedByUser?: User;

  @Column({ nullable: true })
  updatedBy?: string;
}
