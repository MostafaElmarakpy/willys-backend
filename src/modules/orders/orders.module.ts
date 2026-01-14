import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Cart } from "src/database/entities/cart.entity";
import { Order } from "src/database/entities/order.entity";
import { OrderItem } from "src/database/entities/order-item.entity";
import { OrderStatusLog } from "src/database/entities/order-status-log.entity";
import { User } from "src/database/entities/user.entity";
import { UserAddress } from "src/database/entities/user-address.entity";
import { CartModule } from "../cart/cart.module";
import { DiscountsModule } from "../discounts/discounts.module";
import { PaymentsModule } from "../payments/payments.module";
import { CheckoutService } from "./checkout.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrdersAdminController } from "./orders-admin.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderStatusLog,
      Cart,
      UserAddress,
      User,
    ]),
    CartModule,
    PaymentsModule,
    DiscountsModule,
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService, CheckoutService],
  exports: [OrdersService, CheckoutService],
})
export class OrdersModule {}
