import { BilingualStringObject } from "src/common/dto/bilingual-string.dto";
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
import { Item } from "./item.entity";
import { User } from "./user.entity";

@Entity("categories")
export class Category extends BaseEntity {
  @Column({ type: "json" })
  name: BilingualStringObject;

  @Column({ type: "json", nullable: true })
  description?: BilingualStringObject;

  @Column({ nullable: true })
  image?: string;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

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

  @OneToMany(
    () => Item,
    (item) => item.category,
  )
  items: Item[];

  @OneToMany(
    () => Bundle,
    (bundle) => bundle.category,
  )
  bundles: Bundle[];
}
