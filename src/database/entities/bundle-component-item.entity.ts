import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { BundleComponent } from "./bundle-component.entity";
import { Item } from "./item.entity";

@Entity("bundle_component_items")
export class BundleComponentItem extends BaseEntity {
  @ManyToOne(
    () => BundleComponent,
    (component) => component.items,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "componentId" })
  component: BundleComponent;

  @Column()
  @Index()
  componentId: string;

  @ManyToOne(() => Item, { nullable: false })
  @JoinColumn({ name: "itemId" })
  item: Item;

  @Column()
  @Index()
  itemId: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  extraCost: number;

  @Column({ default: 0 })
  sortOrder: number;
}
