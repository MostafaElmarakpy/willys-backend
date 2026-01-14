import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Branch } from "src/database/entities/branch.entity";
import { BranchBundleOverride } from "src/database/entities/branch-bundle-override.entity";
import { BranchCategoryOverride } from "src/database/entities/branch-category-override.entity";
import { BranchItemOverride } from "src/database/entities/branch-item-override.entity";
import { Bundle } from "src/database/entities/bundle.entity";
import { Category } from "src/database/entities/category.entity";
import { Item } from "src/database/entities/item.entity";
import { BranchMenuController } from "./branch-menu.controller";
import { BranchMenuService } from "./branch-menu.service";
import { BranchMenuAdminController } from "./branch-menu-admin.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      Category,
      Item,
      Bundle,
      BranchCategoryOverride,
      BranchItemOverride,
      BranchBundleOverride,
    ]),
  ],
  controllers: [BranchMenuAdminController, BranchMenuController],
  providers: [BranchMenuService],
  exports: [BranchMenuService],
})
export class BranchMenuModule {}
