import {
  Body,
  Controller,
  Logger,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PaymobWebhookPayload } from "./interfaces/paymob-webhook-payload.interface";
import { PaymentsService } from "./payments.service";
import { PaymobService } from "./paymob.service";

@Controller("payments/paymob/webhook")
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymobService: PaymobService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async handlePaymobWebhook(@Body() payload: PaymobWebhookPayload) {
    try {
      this.logger.log("Received Paymob webhook");

      // Extract HMAC from payload
      const receivedHmac = payload.obj.hmac;

      if (!receivedHmac) {
        this.logger.warn("Webhook received without HMAC signature");
        throw new UnauthorizedException("Missing HMAC signature");
      }

      // Verify HMAC signature
      const isValid = this.paymobService.verifyHmacSignature(
        payload,
        receivedHmac,
      );

      if (!isValid) {
        this.logger.warn("Invalid HMAC signature received", {
          merchantOrderId: payload.obj.order?.merchant_order_id,
        });
        throw new UnauthorizedException("Invalid HMAC signature");
      }

      this.logger.log("HMAC signature verified successfully");

      // Process the webhook
      await this.paymentsService.handleWebhookUpdate(payload);

      this.logger.log("Webhook processed successfully");

      return { received: true };
    } catch (error) {
      this.logger.error("Webhook processing failed", error);

      // Still return 200 to prevent Paymob retries for invalid data
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      return { received: false, error: error.message };
    }
  }
}
