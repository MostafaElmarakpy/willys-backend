import { BilingualStringObject } from "src/common/dto/bilingual-string.dto";
import { DiscountType } from "src/common/enums/DiscountType";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Order } from "./order.entity";

export type OrderItemType = "ITEM" | "BUNDLE";

export interface OrderItemSelectedVariant {
  name: string;
  value: string;
  price: number;
}

export interface OrderItemCustomization {
  ingredientId: string;
  name: BilingualStringObject;
  action: "ADD" | "REMOVE" | "EXTRA";
  price: number;
}

export interface OrderItemExtra {
  ingredientId: string;
  name: BilingualStringObject;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderItemAppliedDiscount {
  discountId: string;
  code?: string;
  type: DiscountType;
  amount: number;
}

@Entity("order_items")
export class OrderItem extends BaseEntity {
  @ManyToOne(
    () => Order,
    (order) => order.items,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "orderId" })
  order: Order;

  @Column()
  @Index()
  orderId: string;

  @Column({ type: "varchar", length: 10 })
  itemType: OrderItemType;

  // Snapshot item data (preserved at order time)
  @Column()
  originalItemId: string;

  @Column({ type: "jsonb" })
  name: BilingualStringObject;

  @Column({ type: "jsonb", nullable: true })
  description?: BilingualStringObject;

  @Column({ type: "varchar", length: 500, nullable: true })
  image?: string;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: "jsonb", nullable: true })
  selectedVariant?: OrderItemSelectedVariant;

  @Column({ type: "jsonb", nullable: true })
  customizations?: OrderItemCustomization[];

  @Column({ type: "jsonb", nullable: true })
  extras?: OrderItemExtra[];

  @Column({ type: "text", nullable: true })
  specialInstructions?: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: "jsonb", nullable: true })
  appliedDiscount?: OrderItemAppliedDiscount;
}
