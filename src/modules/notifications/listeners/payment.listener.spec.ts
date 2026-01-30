import { Test, type TestingModule } from "@nestjs/testing";
import { NotificationType } from "src/common/enums/NotificationType";
import { NotificationsService } from "../notifications.service";
import { PaymentEventListener } from "./payment.listener";

describe("PaymentEventListener", () => {
  let listener: PaymentEventListener;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockPaymentSuccessEvent = {
    paymentId: "payment-123",
    transactionId: "txn-123",
    amount: 150.0,
    customerName: "John Doe",
    orderId: "order-123",
    orderNumber: "ORD-001",
  };

  const mockPaymentFailedEvent = {
    paymentId: "payment-123",
    transactionId: "txn-123",
    amount: 150.0,
    customerName: "John Doe",
    errorMessage: "Card declined",
  };

  const mockPaymentRefundedEvent = {
    paymentId: "payment-123",
    refundId: "refund-123",
    originalAmount: 150.0,
    refundAmount: 50.0,
    customerName: "John Doe",
    orderNumber: "ORD-001",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentEventListener,
        {
          provide: NotificationsService,
          useValue: {
            sendNotificationToAdmins: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<PaymentEventListener>(PaymentEventListener);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handlePaymentSuccess", () => {
    it("should send notification to admins when payment succeeds", async () => {
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handlePaymentSuccess(mockPaymentSuccessEvent);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.PAYMENT_SUCCESS,
        "Payment Successful",
        expect.stringContaining(mockPaymentSuccessEvent.customerName),
        expect.objectContaining({
          paymentId: mockPaymentSuccessEvent.paymentId,
          transactionId: mockPaymentSuccessEvent.transactionId,
          amount: mockPaymentSuccessEvent.amount,
          orderId: mockPaymentSuccessEvent.orderId,
          orderNumber: mockPaymentSuccessEvent.orderNumber,
        }),
      );
    });

    it("should send notification without order info when not provided", async () => {
      const eventWithoutOrder = {
        ...mockPaymentSuccessEvent,
        orderId: undefined,
        orderNumber: undefined,
      };
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handlePaymentSuccess(eventWithoutOrder as any);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.PAYMENT_SUCCESS,
        "Payment Successful",
        expect.any(String),
        expect.objectContaining({
          orderId: "",
          orderNumber: "",
          link: "/payments",
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      notificationsService.sendNotificationToAdmins.mockRejectedValue(
        new Error("Notification failed"),
      );

      await expect(
        listener.handlePaymentSuccess(mockPaymentSuccessEvent),
      ).resolves.not.toThrow();
    });
  });

  describe("handlePaymentFailed", () => {
    it("should send notification to admins when payment fails", async () => {
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handlePaymentFailed(mockPaymentFailedEvent);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.PAYMENT_FAILED,
        "Payment Failed",
        expect.stringContaining(mockPaymentFailedEvent.errorMessage as string),
        expect.objectContaining({
          paymentId: mockPaymentFailedEvent.paymentId,
          transactionId: mockPaymentFailedEvent.transactionId,
          amount: mockPaymentFailedEvent.amount,
          errorMessage: mockPaymentFailedEvent.errorMessage,
        }),
      );
    });

    it("should send notification without error message when not provided", async () => {
      const eventWithoutError = {
        ...mockPaymentFailedEvent,
        errorMessage: undefined,
      };
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handlePaymentFailed(eventWithoutError as any);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.PAYMENT_FAILED,
        "Payment Failed",
        expect.any(String),
        expect.objectContaining({
          errorMessage: "",
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      notificationsService.sendNotificationToAdmins.mockRejectedValue(
        new Error("Notification failed"),
      );

      await expect(
        listener.handlePaymentFailed(mockPaymentFailedEvent),
      ).resolves.not.toThrow();
    });
  });

  describe("handlePaymentRefunded", () => {
    it("should send notification to admins when payment is refunded", async () => {
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handlePaymentRefunded(mockPaymentRefundedEvent);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.PAYMENT_REFUNDED,
        "Payment Refunded",
        expect.stringContaining(mockPaymentRefundedEvent.customerName),
        expect.objectContaining({
          paymentId: mockPaymentRefundedEvent.paymentId,
          refundId: mockPaymentRefundedEvent.refundId,
          originalAmount: mockPaymentRefundedEvent.originalAmount,
          refundAmount: mockPaymentRefundedEvent.refundAmount,
          orderNumber: mockPaymentRefundedEvent.orderNumber,
        }),
      );
    });

    it("should send notification without order number when not provided", async () => {
      const eventWithoutOrder = {
        ...mockPaymentRefundedEvent,
        orderNumber: undefined,
      };
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handlePaymentRefunded(eventWithoutOrder as any);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.PAYMENT_REFUNDED,
        "Payment Refunded",
        expect.any(String),
        expect.objectContaining({
          orderNumber: "",
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      notificationsService.sendNotificationToAdmins.mockRejectedValue(
        new Error("Notification failed"),
      );

      await expect(
        listener.handlePaymentRefunded(mockPaymentRefundedEvent),
      ).resolves.not.toThrow();
    });
  });
});
