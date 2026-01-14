import { HttpService } from "@nestjs/axios";
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { ConfigService } from "src/config/config.service";
import { PaymobAuthResponse } from "./interfaces/paymob-auth-response.interface";
import {
  OrderItem,
  PaymobOrderResponse,
} from "./interfaces/paymob-order-response.interface";
import {
  BillingData,
  PaymobPaymentKeyResponse,
} from "./interfaces/paymob-payment-key-response.interface";
import { HmacValidator } from "./utils/hmac-validator.util";

@Injectable()
export class PaymobService {
  private readonly logger = new Logger(PaymobService.name);
  private readonly baseUrl = "https://accept.paymob.com/api";
  private authTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async authenticate(): Promise<string> {
    // Check if we have a cached token that hasn't expired
    if (this.authTokenCache && this.authTokenCache.expiresAt > Date.now()) {
      return this.authTokenCache.token;
    }

    try {
      this.logger.log("Authenticating with Paymob API");

      const response = await firstValueFrom(
        this.httpService.post<PaymobAuthResponse>(
          `${this.baseUrl}/auth/tokens`,
          {
            api_key: this.configService.get("paymobApiKey"),
          },
        ),
      );

      const token = response.data.token;

      // Cache token for 50 minutes (expires in 1 hour)
      this.authTokenCache = {
        token,
        expiresAt: Date.now() + 50 * 60 * 1000,
      };

      this.logger.log("Successfully authenticated with Paymob");
      return token;
    } catch (error) {
      this.logger.error("Paymob authentication failed", error);
      throw new ServiceUnavailableException("Payment provider unavailable");
    }
  }

  async createOrder(
    amount: number,
    currency: string,
    merchantOrderId: string,
    items?: OrderItem[],
  ): Promise<PaymobOrderResponse> {
    try {
      const authToken = await this.authenticate();

      this.logger.log(`Creating Paymob order for ${merchantOrderId}`);

      const amountCents = Math.round(amount * 100);

      const response = await firstValueFrom(
        this.httpService.post<PaymobOrderResponse>(
          `${this.baseUrl}/ecommerce/orders`,
          {
            auth_token: authToken,
            delivery_needed: false,
            amount_cents: amountCents,
            currency,
            merchant_order_id: merchantOrderId,
            items: items || [
              {
                name: "Payment",
                amount_cents: amountCents,
                quantity: 1,
              },
            ],
          },
        ),
      );

      this.logger.log(`Paymob order created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error("Failed to create Paymob order", error);
      throw new InternalServerErrorException("Failed to create payment order");
    }
  }

  async createPaymentKey(
    authToken: string,
    orderId: number,
    _userId: string,
    amount: number,
    billingData?: Partial<BillingData>,
  ): Promise<PaymobPaymentKeyResponse> {
    try {
      this.logger.log(`Creating payment key for order ${orderId}`);

      const amountCents = Math.round(amount * 100);

      const defaultBillingData: BillingData = {
        apartment: "NA",
        email: billingData?.email || "customer@example.com",
        floor: "NA",
        first_name: billingData?.first_name || "Customer",
        street: "NA",
        building: "NA",
        phone_number: billingData?.phone_number || "+20100000000",
        shipping_method: "NA",
        postal_code: "NA",
        city: billingData?.city || "Cairo",
        country: "EG",
        last_name: billingData?.last_name || "User",
        state: billingData?.state || "Cairo",
      };

      const response = await firstValueFrom(
        this.httpService.post<PaymobPaymentKeyResponse>(
          `${this.baseUrl}/acceptance/payment_keys`,
          {
            auth_token: authToken,
            amount_cents: amountCents,
            expiration: 3600,
            order_id: orderId,
            billing_data: { ...defaultBillingData, ...billingData },
            currency: "EGP",
            integration_id: Number(
              this.configService.get("paymobCreditCardIntegrationId"),
            ),
          },
        ),
      );

      this.logger.log("Payment key created successfully");
      return response.data;
    } catch (error) {
      this.logger.error("Failed to create payment key", error);
      throw new InternalServerErrorException("Failed to generate payment key");
    }
  }

  async processRefund(
    transactionId: string,
    amountCents: number,
  ): Promise<any> {
    try {
      const authToken = await this.authenticate();

      this.logger.log(`Processing refund for transaction ${transactionId}`);

      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/acceptance/void_refund/refund`, {
          auth_token: authToken,
          transaction_id: transactionId,
          amount_cents: amountCents,
        }),
      );

      this.logger.log(`Refund processed successfully: ${response.data.id}`);
      return response.data;
    } catch (error) {
      this.logger.error("Failed to process refund", error);
      throw new InternalServerErrorException("Failed to process refund");
    }
  }

  async getTransactionStatus(transactionId: string): Promise<any> {
    try {
      const authToken = await this.authenticate();

      this.logger.log(`Querying transaction status: ${transactionId}`);

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/acceptance/transactions/${transactionId}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error("Failed to get transaction status", error);
      throw new InternalServerErrorException(
        "Failed to retrieve transaction status",
      );
    }
  }

  verifyHmacSignature(payload: any, receivedHmac: string): boolean {
    const secretKey = this.configService.get("paymobSecretKey") as string;
    return HmacValidator.verifyPaymobWebhook(payload, receivedHmac, secretKey);
  }

  buildIframeUrl(paymentToken: string): string {
    const iframeId = this.configService.get("paymobIframeId");
    return `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;
  }
}
