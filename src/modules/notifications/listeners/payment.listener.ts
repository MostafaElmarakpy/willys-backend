import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationType } from "src/common/enums/NotificationType";
import {
  PaymentFailedEvent,
  PaymentRefundedEvent,
  PaymentSuccessEvent,
} from "../events/payment.events";
import { NotificationsService } from "../notifications.service";

@Injectable()
export class PaymentEventListener {
  private readonly logger = new Logger(PaymentEventListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent("payment.success")
  async handlePaymentSuccess(event: PaymentSuccessEvent): Promise<void> {
    this.logger.log(`Payment success event received: ${event.transactionId}`);

    const orderInfo = event.orderNumber
      ? ` for order ${event.orderNumber}`
      : "";

    await this.notificationsService.sendNotificationToAdmins(
      NotificationType.PAYMENT_SUCCESS,
      "Payment Successful",
      `Payment of ${event.amount} EGP received from ${event.customerName}${orderInfo}`,
      {
        paymentId: event.paymentId,
        transactionId: event.transactionId,
        amount: event.amount,
        orderId: event.orderId || "",
        orderNumber: event.orderNumber || "",
        link: event.orderId ? `/orders/${event.orderId}` : `/payments`,
      },
    );
  }

  @OnEvent("payment.failed")
  async handlePaymentFailed(event: PaymentFailedEvent): Promise<void> {
    this.logger.log(`Payment failed event received: ${event.transactionId}`);

    await this.notificationsService.sendNotificationToAdmins(
      NotificationType.PAYMENT_FAILED,
      "Payment Failed",
      `Payment of ${event.amount} EGP from ${event.customerName} failed${event.errorMessage ? `: ${event.errorMessage}` : ""}`,
      {
        paymentId: event.paymentId,
        transactionId: event.transactionId,
        amount: event.amount,
        errorMessage: event.errorMessage || "",
        link: `/payments`,
      },
    );
  }

  @OnEvent("payment.refunded")
  async handlePaymentRefunded(event: PaymentRefundedEvent): Promise<void> {
    this.logger.log(`Payment refunded event received: ${event.refundId}`);

    const orderInfo = event.orderNumber
      ? ` for order ${event.orderNumber}`
      : "";

    await this.notificationsService.sendNotificationToAdmins(
      NotificationType.PAYMENT_REFUNDED,
      "Payment Refunded",
      `Refund of ${event.refundAmount} EGP processed for ${event.customerName}${orderInfo}`,
      {
        paymentId: event.paymentId,
        refundId: event.refundId,
        originalAmount: event.originalAmount,
        refundAmount: event.refundAmount,
        orderNumber: event.orderNumber || "",
        link: `/payments`,
      },
    );
  }
}
