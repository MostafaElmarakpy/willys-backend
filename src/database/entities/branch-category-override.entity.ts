import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Branch } from "./branch.entity";
import { Category } from "./category.entity";
import { User } from "./user.entity";

@Entity("branch_category_overrides")
@Unique(["branchId", "categoryId"])
@Index(["branchId", "isAvailable"])
export class BranchCategoryOverride extends BaseEntity {
  @Column()
  @Index()
  branchId: string;

  @ManyToOne(() => Branch, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "branchId" })
  branch: Branch;

  @Column()
  @Index()
  categoryId: string;

  @ManyToOne(() => Category, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "categoryId" })
  category: Category;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: "text", nullable: true })
  reason?: string;

  @Column({ nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "createdById" })
  createdBy?: User;

  @Column({ nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "updatedById" })
  updatedBy?: User;
}
