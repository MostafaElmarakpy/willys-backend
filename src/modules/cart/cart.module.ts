import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Branch } from "src/database/entities/branch.entity";
import { Bundle } from "src/database/entities/bundle.entity";
import { Cart } from "src/database/entities/cart.entity";
import { CartItem } from "src/database/entities/cart-item.entity";
import { Item } from "src/database/entities/item.entity";
import { UserAddress } from "src/database/entities/user-address.entity";
import { BranchMenuModule } from "../branch-menu/branch-menu.module";
import { BranchesModule } from "../branches/branches.module";
import { DiscountsModule } from "../discounts/discounts.module";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Item,
      Bundle,
      UserAddress,
      Branch,
    ]),
    DiscountsModule,
    BranchesModule,
    BranchMenuModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
