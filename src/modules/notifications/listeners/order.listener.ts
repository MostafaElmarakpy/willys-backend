import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationType } from "src/common/enums/NotificationType";
import {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
} from "../events/order.events";
import { NotificationsService } from "../notifications.service";

@Injectable()
export class OrderEventListener {
  private readonly logger = new Logger(OrderEventListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent("order.created")
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Order created event received: ${event.orderNumber}`);

    await this.notificationsService.sendNotificationToAdmins(
      NotificationType.ORDER_NEW,
      "New Order Received",
      `Order ${event.orderNumber} placed by ${event.customerName} - ${event.total} EGP (${event.orderType})`,
      {
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        userId: event.userId,
        total: event.total,
        branchId: event.branchId,
        branchName: event.branchName,
        orderType: event.orderType,
        link: `/orders/${event.orderId}`,
      },
    );
  }

  @OnEvent("order.status.changed")
  async handleOrderStatusChanged(
    event: OrderStatusChangedEvent,
  ): Promise<void> {
    this.logger.log(
      `Order status changed event received: ${event.orderNumber} - ${event.previousStatus} -> ${event.newStatus}`,
    );

    await this.notificationsService.sendNotificationToAdmins(
      NotificationType.ORDER_STATUS_CHANGED,
      "Order Status Updated",
      `Order ${event.orderNumber} changed from ${event.previousStatus} to ${event.newStatus}`,
      {
        orderId: event.orderId,
        orderNumber: event.orderNumber,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        link: `/orders/${event.orderId}`,
      },
    );
  }
}
