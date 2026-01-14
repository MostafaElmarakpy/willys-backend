import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "src/config/config.module";
import { Discount } from "src/database/entities/discount.entity";
import { DiscountUsageLog } from "src/database/entities/discount-usage-log.entity";
import { Item } from "src/database/entities/item.entity";
import { ItemDiscount } from "src/database/entities/item-discount.entity";
import { User } from "src/database/entities/user.entity";
import { UserDiscount } from "src/database/entities/user-discount.entity";
import { DiscountsController } from "./discounts.controller";
import { DiscountsService } from "./discounts.service";
import { DiscountsAdminController } from "./discounts-admin.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Discount,
      UserDiscount,
      ItemDiscount,
      DiscountUsageLog,
      User,
      Item,
    ]),
    ConfigModule,
  ],
  controllers: [DiscountsAdminController, DiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
