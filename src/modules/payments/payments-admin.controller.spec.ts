import { Test, type TestingModule } from "@nestjs/testing";
import { PaymentsService } from "./payments.service";
import { PaymentsAdminController } from "./payments-admin.controller";
import { RefundsService } from "./refunds.service";

describe("PaymentsAdminController", () => {
  let controller: PaymentsAdminController;
  let paymentsService: jest.Mocked<PaymentsService>;
  let refundsService: jest.Mocked<RefundsService>;

  const mockUserId = "admin-123";
  const mockPaymentId = "payment-123";
  const mockRefundId = "refund-123";

  const mockPayment = {
    id: mockPaymentId,
    amount: 150.0,
    status: "COMPLETED",
    method: "CARD",
    transactionLogs: [{ id: "log-1", action: "CREATED" }],
    refunds: [],
  };

  const mockRefund = {
    id: mockRefundId,
    paymentId: mockPaymentId,
    amount: 50.0,
    status: "PENDING",
    reason: "Customer request",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsAdminController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            findAll: jest.fn(),
            getPaymentStatistics: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: RefundsService,
          useValue: {
            findAll: jest.fn(),
            approveRefund: jest.fn(),
            rejectRefund: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentsAdminController>(PaymentsAdminController);
    paymentsService = module.get(PaymentsService);
    refundsService = module.get(RefundsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllPayments", () => {
    it("should return all payments with filters", async () => {
      const filterDto = { page: 1, limit: 10, status: "COMPLETED" };
      const mockResult = {
        payments: [mockPayment],
        total: 1,
        page: 1,
        limit: 10,
      };
      paymentsService.findAll.mockResolvedValue(mockResult as any);

      const result = await controller.getAllPayments(filterDto as any);

      expect(paymentsService.findAll).toHaveBeenCalledWith(filterDto);
      expect(result.message).toBe("Payments retrieved successfully");
      expect(result.data).toEqual(mockResult);
    });
  });

  describe("getPaymentStatistics", () => {
    it("should return payment statistics", async () => {
      const mockStats = {
        totalPayments: 100,
        totalRevenue: 15000,
        averageOrderValue: 150,
        paymentMethodBreakdown: { CARD: 60, CASH: 40 },
      };
      paymentsService.getPaymentStatistics.mockResolvedValue(mockStats as any);

      const result = await controller.getPaymentStatistics();

      expect(paymentsService.getPaymentStatistics).toHaveBeenCalled();
      expect(result.message).toBe("Payment statistics retrieved successfully");
      expect(result.data).toEqual(mockStats);
    });
  });

  describe("getPaymentDetails", () => {
    it("should return payment details with logs and refunds", async () => {
      paymentsService.findOne.mockResolvedValue(mockPayment as any);

      const result = await controller.getPaymentDetails(mockPaymentId);

      expect(paymentsService.findOne).toHaveBeenCalledWith(mockPaymentId);
      expect(result.message).toBe("Payment details retrieved successfully");
      expect(result.data.logs).toEqual(mockPayment.transactionLogs);
      expect(result.data.refunds).toEqual(mockPayment.refunds);
    });
  });

  describe("getPendingRefunds", () => {
    it("should return pending refunds", async () => {
      const pendingRefunds = [mockRefund];
      refundsService.findAll.mockResolvedValue(pendingRefunds as any);

      const result = await controller.getPendingRefunds();

      expect(refundsService.findAll).toHaveBeenCalledWith({
        status: "PENDING",
      });
      expect(result.message).toBe("Pending refunds retrieved successfully");
      expect(result.data).toEqual(pendingRefunds);
    });
  });

  describe("getAllRefunds", () => {
    it("should return all refunds without filter", async () => {
      const allRefunds = [mockRefund];
      refundsService.findAll.mockResolvedValue(allRefunds as any);

      const result = await controller.getAllRefunds();

      expect(refundsService.findAll).toHaveBeenCalledWith(undefined);
      expect(result.message).toBe("Refunds retrieved successfully");
    });

    it("should return refunds filtered by status", async () => {
      const approvedRefunds = [{ ...mockRefund, status: "APPROVED" }];
      refundsService.findAll.mockResolvedValue(approvedRefunds as any);

      const result = await controller.getAllRefunds("APPROVED");

      expect(refundsService.findAll).toHaveBeenCalledWith({
        status: "APPROVED",
      });
      expect(result.data).toEqual(approvedRefunds);
    });
  });

  describe("approveRefund", () => {
    it("should approve a refund", async () => {
      const approveDto = { notes: "Approved by admin" };
      const approvedRefund = { ...mockRefund, status: "APPROVED" };
      refundsService.approveRefund.mockResolvedValue(approvedRefund as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.approveRefund(
        mockRefundId,
        approveDto as any,
        mockReq,
      );

      expect(refundsService.approveRefund).toHaveBeenCalledWith(
        mockRefundId,
        mockUserId,
        approveDto,
      );
      expect(result.message).toBe("Refund approved and processed successfully");
      expect(result.data).toEqual(approvedRefund);
    });
  });

  describe("rejectRefund", () => {
    it("should reject a refund", async () => {
      const rejectDto = { reason: "Insufficient evidence" };
      const rejectedRefund = { ...mockRefund, status: "REJECTED" };
      refundsService.rejectRefund.mockResolvedValue(rejectedRefund as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.rejectRefund(
        mockRefundId,
        rejectDto as any,
        mockReq,
      );

      expect(refundsService.rejectRefund).toHaveBeenCalledWith(
        mockRefundId,
        mockUserId,
        rejectDto,
      );
      expect(result.message).toBe("Refund rejected successfully");
      expect(result.data).toEqual(rejectedRefund);
    });
  });
});
