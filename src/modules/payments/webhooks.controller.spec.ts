import { Test, type TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { WebhooksController } from "./webhooks.controller";
import { PaymentsService } from "./payments.service";
import { PaymobService } from "./paymob.service";

describe("WebhooksController", () => {
  let controller: WebhooksController;
  let paymentsService: jest.Mocked<PaymentsService>;
  let paymobService: jest.Mocked<PaymobService>;

  const mockPaymobPayload = {
    type: "TRANSACTION",
    obj: {
      id: 12345,
      pending: false,
      amount_cents: 15000,
      success: true,
      is_auth: false,
      is_capture: true,
      is_standalone_payment: true,
      is_voided: false,
      is_refunded: false,
      is_3d_secure: true,
      hmac: "valid-hmac-signature",
      order: {
        id: 67890,
        merchant_order_id: "order-123",
      },
      source_data: {
        type: "card",
        pan: "1234",
        sub_type: "VISA",
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            handleWebhookUpdate: jest.fn(),
          },
        },
        {
          provide: PaymobService,
          useValue: {
            verifyHmacSignature: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    paymentsService = module.get(PaymentsService);
    paymobService = module.get(PaymobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handlePaymobWebhook", () => {
    it("should process valid webhook with correct HMAC", async () => {
      paymobService.verifyHmacSignature.mockReturnValue(true);
      paymentsService.handleWebhookUpdate.mockResolvedValue(undefined);

      const result = await controller.handlePaymobWebhook(mockPaymobPayload as any);

      expect(paymobService.verifyHmacSignature).toHaveBeenCalledWith(
        mockPaymobPayload,
        mockPaymobPayload.obj.hmac,
      );
      expect(paymentsService.handleWebhookUpdate).toHaveBeenCalledWith(
        mockPaymobPayload,
      );
      expect(result).toEqual({ received: true });
    });

    it("should throw UnauthorizedException when HMAC is missing", async () => {
      const payloadWithoutHmac = {
        ...mockPaymobPayload,
        obj: { ...mockPaymobPayload.obj, hmac: undefined },
      };

      await expect(
        controller.handlePaymobWebhook(payloadWithoutHmac as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(paymobService.verifyHmacSignature).not.toHaveBeenCalled();
      expect(paymentsService.handleWebhookUpdate).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when HMAC is invalid", async () => {
      paymobService.verifyHmacSignature.mockReturnValue(false);

      await expect(
        controller.handlePaymobWebhook(mockPaymobPayload as any),
      ).rejects.toThrow(UnauthorizedException);

      expect(paymobService.verifyHmacSignature).toHaveBeenCalled();
      expect(paymentsService.handleWebhookUpdate).not.toHaveBeenCalled();
    });

    it("should return error response for non-auth processing errors", async () => {
      paymobService.verifyHmacSignature.mockReturnValue(true);
      paymentsService.handleWebhookUpdate.mockRejectedValue(
        new Error("Processing failed"),
      );

      const result = await controller.handlePaymobWebhook(mockPaymobPayload as any);

      expect(result).toEqual({
        received: false,
        error: "Processing failed",
      });
    });
  });
});
