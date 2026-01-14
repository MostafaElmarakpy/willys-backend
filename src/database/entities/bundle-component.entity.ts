import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Bundle } from "./bundle.entity";
import { BundleComponentItem } from "./bundle-component-item.entity";
import { Category } from "./category.entity";
import { Item } from "./item.entity";

@Entity("bundle_components")
export class BundleComponent extends BaseEntity {
  @ManyToOne(
    () => Bundle,
    (bundle) => bundle.components,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "bundleId" })
  bundle: Bundle;

  @Column()
  @Index()
  bundleId: string;

  @ManyToOne(() => Category, { nullable: false })
  @JoinColumn({ name: "categoryId" })
  category: Category;

  @Column()
  @Index()
  categoryId: string;

  @ManyToOne(() => Item, { nullable: false })
  @JoinColumn({ name: "defaultItemId" })
  defaultItem: Item;

  @Column()
  @Index()
  defaultItemId: string;

  @Column({ type: "int" })
  quantity: number;

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(
    () => BundleComponentItem,
    (item) => item.component,
    {
      cascade: true,
    },
  )
  items: BundleComponentItem[];
}
