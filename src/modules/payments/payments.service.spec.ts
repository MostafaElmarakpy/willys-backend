import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { PaymentEventType } from "src/common/enums/PaymentEventType";
import { PaymentStatus } from "src/common/enums/PaymentStatus";
import { PaymentType } from "src/common/enums/PaymentType";
import { Payment } from "src/database/entities/payment.entity";
import { PaymentTransactionLog } from "src/database/entities/payment-transaction-log.entity";
import { Repository } from "typeorm";
import { PaymentsService } from "./payments.service";
import { PaymobService } from "./paymob.service";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let paymentRepository: jest.Mocked<Repository<Payment>>;
  let transactionLogRepository: jest.Mocked<Repository<PaymentTransactionLog>>;
  let paymobService: jest.Mocked<PaymobService>;

  const mockUserId = "user-123";
  const mockPaymentId = "payment-123";
  const mockTransactionId = "TXN-123456";

  const mockPayment: Partial<Payment> = {
    id: mockPaymentId,
    transactionId: mockTransactionId,
    amount: 100,
    currency: "EGP",
    paymentType: PaymentType.CARD,
    status: PaymentStatus.PENDING,
    userId: mockUserId,
    merchantOrderId: "ORDER-123",
    isRefundable: true,
    refundedAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransactionLog: Partial<PaymentTransactionLog> = {
    id: "log-123",
    paymentId: mockPaymentId,
    eventType: PaymentEventType.CREATED,
    previousStatus: PaymentStatus.PENDING,
    newStatus: PaymentStatus.PENDING,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PaymentTransactionLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: PaymobService,
          useValue: {
            authenticate: jest.fn(),
            createOrder: jest.fn(),
            createPaymentKey: jest.fn(),
            buildIframeUrl: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepository = module.get(getRepositoryToken(Payment));
    transactionLogRepository = module.get(
      getRepositoryToken(PaymentTransactionLog),
    );
    paymobService = module.get(PaymobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createPayment", () => {
    it("should create a new payment successfully", async () => {
      const createPaymentDto = {
        amount: 100,
        paymentType: PaymentType.CARD,
        description: "Test payment",
      };

      paymentRepository.findOne.mockResolvedValue(null);
      paymentRepository.create.mockReturnValue(mockPayment as Payment);
      paymentRepository.save.mockResolvedValue(mockPayment as Payment);
      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      const result = await service.createPayment(
        createPaymentDto,
        mockUserId,
        "127.0.0.1",
        "Mozilla/5.0",
      );

      expect(result).toBeDefined();
      expect(paymentRepository.create).toHaveBeenCalled();
      expect(paymentRepository.save).toHaveBeenCalled();
      expect(transactionLogRepository.create).toHaveBeenCalled();
    });

    it("should throw BadRequestException for duplicate merchantOrderId", async () => {
      const createPaymentDto = {
        amount: 100,
        paymentType: PaymentType.CARD,
        merchantOrderId: "ORDER-123",
      };

      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);

      await expect(
        service.createPayment(createPaymentDto, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should set isRefundable to true for card payments", async () => {
      const createPaymentDto = {
        amount: 100,
        paymentType: PaymentType.CARD,
      };

      paymentRepository.findOne.mockResolvedValue(null);
      paymentRepository.create.mockReturnValue(mockPayment as Payment);
      paymentRepository.save.mockResolvedValue(mockPayment as Payment);
      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      await service.createPayment(createPaymentDto, mockUserId);

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isRefundable: true,
        }),
      );
    });

    it("should set isRefundable to false for cash payments", async () => {
      const createPaymentDto = {
        amount: 100,
        paymentType: PaymentType.CASH,
      };

      const cashPayment = { ...mockPayment, paymentType: PaymentType.CASH };
      paymentRepository.findOne.mockResolvedValue(null);
      paymentRepository.create.mockReturnValue(cashPayment as Payment);
      paymentRepository.save.mockResolvedValue(cashPayment as Payment);
      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      await service.createPayment(createPaymentDto, mockUserId);

      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isRefundable: false,
        }),
      );
    });
  });

  describe("processCardPayment", () => {
    it("should process card payment successfully", async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepository.findOne.mockResolvedValue(pendingPayment as Payment);
      paymentRepository.save.mockResolvedValue({
        ...pendingPayment,
        status: PaymentStatus.PROCESSING,
      } as Payment);

      paymobService.authenticate.mockResolvedValue("auth-token");
      paymobService.createOrder.mockResolvedValue({ id: 12345 } as any);
      paymobService.createPaymentKey.mockResolvedValue({
        token: "payment-key-token",
      } as any);
      paymobService.buildIframeUrl.mockReturnValue(
        "https://accept.paymob.com/iframe/123",
      );

      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      const result = await service.processCardPayment(
        mockPaymentId,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result.iframeUrl).toBe("https://accept.paymob.com/iframe/123");
      expect(paymobService.authenticate).toHaveBeenCalled();
      expect(paymobService.createOrder).toHaveBeenCalled();
      expect(paymobService.createPaymentKey).toHaveBeenCalled();
    });

    it("should throw NotFoundException if payment not found", async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processCardPayment(mockPaymentId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if payment type is not CARD", async () => {
      const cashPayment = {
        ...mockPayment,
        paymentType: PaymentType.CASH,
        status: PaymentStatus.PENDING,
      };
      paymentRepository.findOne.mockResolvedValue(cashPayment as Payment);

      await expect(
        service.processCardPayment(mockPaymentId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if payment is not pending", async () => {
      const processedPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      };
      paymentRepository.findOne.mockResolvedValue(processedPayment as Payment);

      await expect(
        service.processCardPayment(mockPaymentId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should update payment to FAILED status on error", async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepository.findOne.mockResolvedValue(pendingPayment as Payment);
      paymentRepository.save.mockResolvedValue(pendingPayment as Payment);

      paymobService.authenticate.mockRejectedValue(
        new Error("Authentication failed"),
      );

      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      await expect(
        service.processCardPayment(mockPaymentId, mockUserId),
      ).rejects.toThrow("Authentication failed");

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.FAILED,
        }),
      );
    });
  });

  describe("processCashPayment", () => {
    it("should process cash payment successfully", async () => {
      const cashPayment = {
        ...mockPayment,
        paymentType: PaymentType.CASH,
        status: PaymentStatus.PENDING,
      };
      paymentRepository.findOne.mockResolvedValue(cashPayment as Payment);
      paymentRepository.save.mockResolvedValue({
        ...cashPayment,
        status: PaymentStatus.SUCCESS,
        cashReferenceNumber: "CASH-123",
      } as Payment);

      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      const result = await service.processCashPayment(
        mockPaymentId,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(result.cashReferenceNumber).toBeDefined();
      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.SUCCESS,
        }),
      );
    });

    it("should throw NotFoundException if payment not found", async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processCashPayment(mockPaymentId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if payment type is not CASH", async () => {
      const cardPayment = {
        ...mockPayment,
        paymentType: PaymentType.CARD,
        status: PaymentStatus.PENDING,
      };
      paymentRepository.findOne.mockResolvedValue(cardPayment as Payment);

      await expect(
        service.processCashPayment(mockPaymentId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if payment is not pending", async () => {
      const processedPayment = {
        ...mockPayment,
        paymentType: PaymentType.CASH,
        status: PaymentStatus.SUCCESS,
      };
      paymentRepository.findOne.mockResolvedValue(processedPayment as Payment);

      await expect(
        service.processCashPayment(mockPaymentId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("handleWebhookUpdate", () => {
    it("should handle successful payment webhook", async () => {
      const webhookPayload = {
        type: "TRANSACTION",
        obj: {
          id: 123456,
          success: true,
          pending: false,
          order: { merchant_order_id: "ORDER-123" },
          source_data: { pan: "1234567890123456", sub_type: "Visa" },
          data: {},
        },
      } as any;

      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      paymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as Payment);

      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      await service.handleWebhookUpdate(webhookPayload);

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.SUCCESS,
          paymobTransactionId: "123456",
          cardLastFourDigits: "3456",
          cardBrand: "Visa",
        }),
      );
    });

    it("should handle failed payment webhook", async () => {
      const webhookPayload = {
        type: "TRANSACTION",
        obj: {
          id: 123456,
          success: false,
          pending: false,
          order: { merchant_order_id: "ORDER-123" },
          source_data: {},
          data: { message: "Payment declined" },
        },
      } as any;

      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      paymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      } as Payment);

      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      await service.handleWebhookUpdate(webhookPayload);

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.FAILED,
          errorMessage: "Payment declined",
        }),
      );
    });

    it("should not update if payment not found", async () => {
      const webhookPayload = {
        type: "TRANSACTION",
        obj: {
          id: 123456,
          success: true,
          pending: false,
          order: { merchant_order_id: "UNKNOWN-ORDER" },
          source_data: {},
          data: {},
        },
      } as any;

      paymentRepository.findOne.mockResolvedValue(null);

      await service.handleWebhookUpdate(webhookPayload);

      expect(paymentRepository.save).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("should return paginated payments", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
      };

      paymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it("should filter by status", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
      };

      paymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.findAll({
        page: 1,
        limit: 10,
        status: PaymentStatus.SUCCESS,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "payment.status = :status",
        { status: PaymentStatus.SUCCESS },
      );
    });

    it("should filter by payment type", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
      };

      paymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.findAll({
        page: 1,
        limit: 10,
        paymentType: PaymentType.CARD,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "payment.paymentType = :paymentType",
        { paymentType: PaymentType.CARD },
      );
    });

    it("should filter by date range", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
      };

      paymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.findAll({
        page: 1,
        limit: 10,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "payment.createdAt BETWEEN :startDate AND :endDate",
        expect.any(Object),
      );
    });

    it("should filter by amount range", async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPayment], 1]),
      };

      paymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.findAll({
        page: 1,
        limit: 10,
        minAmount: 50,
        maxAmount: 200,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "payment.amount >= :minAmount",
        { minAmount: 50 },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "payment.amount <= :maxAmount",
        { maxAmount: 200 },
      );
    });
  });

  describe("findOne", () => {
    it("should return a payment by id", async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);

      const result = await service.findOne(mockPaymentId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockPaymentId);
    });

    it("should return a payment by id and userId", async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);

      const result = await service.findOne(mockPaymentId, mockUserId);

      expect(result).toBeDefined();
      expect(paymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPaymentId, userId: mockUserId },
        relations: ["user", "transactionLogs", "refunds"],
      });
    });

    it("should throw NotFoundException if payment not found", async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockPaymentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByTransactionId", () => {
    it("should return a payment by transaction id", async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);

      const result = await service.findByTransactionId(mockTransactionId);

      expect(result).toBeDefined();
      expect(result.transactionId).toBe(mockTransactionId);
    });

    it("should throw NotFoundException if payment not found", async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findByTransactionId(mockTransactionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("updatePaymentStatus", () => {
    it("should update payment status successfully", async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      paymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      } as Payment);

      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      const result = await service.updatePaymentStatus(
        mockPaymentId,
        PaymentStatus.SUCCESS,
      );

      expect(result.status).toBe(PaymentStatus.SUCCESS);
    });

    it("should update payment with metadata", async () => {
      const metadata = { paidAt: new Date() };
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      paymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
        ...metadata,
      } as Payment);

      transactionLogRepository.create.mockReturnValue(
        mockTransactionLog as PaymentTransactionLog,
      );
      transactionLogRepository.save.mockResolvedValue(
        mockTransactionLog as PaymentTransactionLog,
      );

      await service.updatePaymentStatus(
        mockPaymentId,
        PaymentStatus.SUCCESS,
        metadata,
      );

      expect(paymentRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException if payment not found", async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePaymentStatus(mockPaymentId, PaymentStatus.SUCCESS),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getPaymentStatistics", () => {
    it("should return payment statistics", async () => {
      paymentRepository.count
        .mockResolvedValueOnce(100) // totalPayments
        .mockResolvedValueOnce(80) // successfulPayments
        .mockResolvedValueOnce(10) // failedPayments
        .mockResolvedValueOnce(60) // cashPayments
        .mockResolvedValueOnce(40); // cardPayments

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };

      mockQueryBuilder.getRawOne
        .mockResolvedValueOnce({ total: 5000 }) // totalAmount
        .mockResolvedValueOnce({ total: 200 }); // refundedAmount

      paymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getPaymentStatistics();

      expect(result).toBeDefined();
      expect(result.totalPayments).toBe(100);
      expect(result.successfulPayments).toBe(80);
      expect(result.failedPayments).toBe(10);
      expect(result.totalAmount).toBe(5000);
      expect(result.refundedAmount).toBe(200);
      expect(result.cashPayments).toBe(60);
      expect(result.cardPayments).toBe(40);
    });

    it("should return 0 for amounts when null", async () => {
      paymentRepository.count.mockResolvedValue(0);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: null }),
      };

      paymentRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getPaymentStatistics();

      expect(result.totalAmount).toBe(0);
      expect(result.refundedAmount).toBe(0);
    });
  });
});
