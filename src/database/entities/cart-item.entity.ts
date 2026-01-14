import { BilingualStringObject } from "src/common/dto/bilingual-string.dto";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Bundle } from "./bundle.entity";
import { Cart } from "./cart.entity";
import { Item } from "./item.entity";

export type CartItemType = "ITEM" | "BUNDLE";

export interface SelectedVariant {
  name: string;
  value: string;
  price: number;
}

export interface CartItemCustomization {
  ingredientId: string;
  name: BilingualStringObject;
  action: "ADD" | "REMOVE" | "EXTRA";
  price: number;
}

export interface CartItemExtra {
  ingredientId: string;
  name: BilingualStringObject;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

@Entity("cart_items")
export class CartItem extends BaseEntity {
  @ManyToOne(
    () => Cart,
    (cart) => cart.items,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "cartId" })
  cart: Cart;

  @Column()
  @Index()
  cartId: string;

  @Column({ type: "varchar", length: 10 })
  itemType: CartItemType;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: "itemId" })
  item?: Item;

  @Column({ nullable: true })
  itemId?: string;

  @ManyToOne(() => Bundle, { nullable: true })
  @JoinColumn({ name: "bundleId" })
  bundle?: Bundle;

  @Column({ nullable: true })
  bundleId?: string;

  @Column({ type: "int", default: 1 })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: "jsonb", nullable: true })
  selectedVariant?: SelectedVariant;

  @Column({ type: "jsonb", nullable: true })
  customizations?: CartItemCustomization[];

  @Column({ type: "jsonb", nullable: true })
  extras?: CartItemExtra[];

  @Column({ type: "text", nullable: true })
  specialInstructions?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ nullable: true })
  appliedDiscountId?: string;
}
