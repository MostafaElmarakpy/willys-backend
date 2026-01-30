import { Test, type TestingModule } from "@nestjs/testing";
import { PaymentType } from "../../common/enums/PaymentType";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { RefundsService } from "./refunds.service";

describe("PaymentsController", () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;
  let refundsService: jest.Mocked<RefundsService>;

  const mockUserId = "user-123";
  const mockPaymentId = "payment-123";

  const mockPayment = {
    id: mockPaymentId,
    userId: mockUserId,
    orderId: "order-123",
    amount: 100,
    paymentType: PaymentType.CARD,
    status: "pending",
  };

  const mockPaymentResponse = {
    payment: mockPayment,
    iframeUrl: "https://pay.example.com/iframe",
    transactionId: "tx-123",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            createPayment: jest.fn(),
            processCardPayment: jest.fn(),
            processCashPayment: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: RefundsService,
          useValue: {
            requestRefund: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    paymentsService = module.get(PaymentsService);
    refundsService = module.get(RefundsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createPayment", () => {
    it("should create a card payment", async () => {
      const createDto = {
        orderId: "order-123",
        amount: 100,
        paymentType: PaymentType.CARD,
      } as any;
      paymentsService.createPayment.mockResolvedValue(mockPayment as any);
      paymentsService.processCardPayment.mockResolvedValue(
        mockPaymentResponse as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.createPayment(
        createDto,
        mockReq,
        "127.0.0.1",
        "Mozilla/5.0",
      );

      expect(paymentsService.createPayment).toHaveBeenCalledWith(
        createDto,
        mockUserId,
        "127.0.0.1",
        "Mozilla/5.0",
      );
      expect(paymentsService.processCardPayment).toHaveBeenCalledWith(
        mockPaymentId,
        mockUserId,
      );
      expect(result.message).toBe("Payment created successfully");
    });

    it("should create a cash payment", async () => {
      const createDto = {
        orderId: "order-123",
        amount: 100,
        paymentType: PaymentType.CASH,
      } as any;
      paymentsService.createPayment.mockResolvedValue(mockPayment as any);
      paymentsService.processCashPayment.mockResolvedValue({
        payment: mockPayment,
      } as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.createPayment(
        createDto,
        mockReq,
        "127.0.0.1",
        "Mozilla/5.0",
      );

      expect(paymentsService.processCashPayment).toHaveBeenCalledWith(
        mockPaymentId,
        mockUserId,
      );
      expect(result.message).toBe("Payment created successfully");
    });
  });

  describe("getMyPayments", () => {
    it("should return user payments", async () => {
      const filterDto = { page: 1, limit: 10 };
      const paymentsResult = {
        payments: [mockPayment],
        total: 1,
        page: 1,
        limit: 10,
      };
      paymentsService.findAll.mockResolvedValue(paymentsResult as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getMyPayments(mockReq, filterDto);

      expect(paymentsService.findAll).toHaveBeenCalledWith({
        ...filterDto,
        userId: mockUserId,
      });
      expect(result.message).toBe("Payments retrieved successfully");
    });
  });

  describe("getPayment", () => {
    it("should return payment by id", async () => {
      paymentsService.findOne.mockResolvedValue(mockPayment as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getPayment(mockPaymentId, mockReq);

      expect(paymentsService.findOne).toHaveBeenCalledWith(
        mockPaymentId,
        mockUserId,
      );
      expect(result.message).toBe("Payment retrieved successfully");
    });
  });

  describe("requestRefund", () => {
    it("should request a refund", async () => {
      const refundDto = { reason: "Item not as described", amount: 50 } as any;
      const mockRefund = {
        id: "refund-123",
        paymentId: mockPaymentId,
        amount: 50,
        status: "pending",
      };
      refundsService.requestRefund.mockResolvedValue(mockRefund as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.requestRefund(
        mockPaymentId,
        refundDto,
        mockReq,
      );

      expect(refundsService.requestRefund).toHaveBeenCalledWith(
        mockPaymentId,
        refundDto,
        mockUserId,
      );
      expect(result.message).toBe("Refund request submitted successfully");
    });
  });
});
