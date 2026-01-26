import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminFcmToken } from "src/database/entities/admin-fcm-token.entity";
import { AdminNotification } from "src/database/entities/admin-notification.entity";
import { AdminNotificationPreferences } from "src/database/entities/admin-notification-preferences.entity";
import { User } from "src/database/entities/user.entity";
import { FcmService } from "./fcm.service";
import { OrderEventListener } from "./listeners/order.listener";
import { PaymentEventListener } from "./listeners/payment.listener";
import { UserEventListener } from "./listeners/user.listener";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminFcmToken,
      AdminNotification,
      AdminNotificationPreferences,
      User,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    FcmService,
    NotificationsService,
    OrderEventListener,
    UserEventListener,
    PaymentEventListener,
  ],
  exports: [NotificationsService, FcmService],
})
export class NotificationsModule {}
