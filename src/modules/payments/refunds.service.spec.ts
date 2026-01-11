import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { PaymobService } from './paymob.service';
import { Refund } from 'src/database/entities/refund.entity';
import { Payment } from 'src/database/entities/payment.entity';
import { RefundType } from 'src/common/enums/RefundType';
import { RefundStatus } from 'src/common/enums/RefundStatus';
import { PaymentStatus } from 'src/common/enums/PaymentStatus';
import { PaymentType } from 'src/common/enums/PaymentType';

describe('RefundsService', () => {
  let service: RefundsService;
  let refundRepository: jest.Mocked<Repository<Refund>>;
  let paymentRepository: jest.Mocked<Repository<Payment>>;
  let paymobService: jest.Mocked<PaymobService>;

  const mockUserId = 'user-123';
  const mockAdminId = 'admin-123';
  const mockPaymentId = 'payment-123';
  const mockRefundId = 'refund-123';

  const mockPayment: Partial<Payment> = {
    id: mockPaymentId,
    transactionId: 'TXN-123456',
    amount: 100,
    currency: 'EGP',
    paymentType: PaymentType.CARD,
    status: PaymentStatus.SUCCESS,
    userId: mockUserId,
    paymobTransactionId: 'paymob-txn-123',
    isRefundable: true,
    refundedAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRefund: Partial<Refund> = {
    id: mockRefundId,
    refundId: 'REF-123456',
    paymentId: mockPaymentId,
    amount: 100,
    refundType: RefundType.FULL,
    status: RefundStatus.PENDING,
    reason: 'Customer request',
    requestedById: mockUserId,
    isAutomatic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsService,
        {
          provide: getRepositoryToken(Refund),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: PaymobService,
          useValue: {
            processRefund: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RefundsService>(RefundsService);
    refundRepository = module.get(getRepositoryToken(Refund));
    paymentRepository = module.get(getRepositoryToken(Payment));
    paymobService = module.get(PaymobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestRefund', () => {
    it('should create a full refund request successfully', async () => {
      const createRefundDto = { reason: 'Customer request' };

      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      refundRepository.create.mockReturnValue(mockRefund as Refund);
      refundRepository.save.mockResolvedValue(mockRefund as Refund);

      const result = await service.requestRefund(
        mockPaymentId,
        createRefundDto,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(refundRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: mockPaymentId,
          amount: 100,
          refundType: RefundType.FULL,
          status: RefundStatus.PENDING,
          reason: 'Customer request',
        }),
      );
    });

    it('should create a partial refund request', async () => {
      const createRefundDto = { reason: 'Partial refund', amount: 50 };

      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      refundRepository.create.mockReturnValue({
        ...mockRefund,
        amount: 50,
        refundType: RefundType.PARTIAL,
      } as Refund);
      refundRepository.save.mockResolvedValue({
        ...mockRefund,
        amount: 50,
        refundType: RefundType.PARTIAL,
      } as Refund);

      const result = await service.requestRefund(
        mockPaymentId,
        createRefundDto,
        mockUserId,
      );

      expect(result).toBeDefined();
      expect(refundRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50,
          refundType: RefundType.PARTIAL,
        }),
      );
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.requestRefund(mockPaymentId, { reason: 'Test' }, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment is not refundable', async () => {
      const nonRefundablePayment = { ...mockPayment, isRefundable: false };
      paymentRepository.findOne.mockResolvedValue(
        nonRefundablePayment as Payment,
      );

      await expect(
        service.requestRefund(mockPaymentId, { reason: 'Test' }, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment is not successful', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepository.findOne.mockResolvedValue(pendingPayment as Payment);

      await expect(
        service.requestRefund(mockPaymentId, { reason: 'Test' }, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund amount exceeds remaining', async () => {
      const partiallyRefundedPayment = { ...mockPayment, refundedAmount: 80 };
      paymentRepository.findOne.mockResolvedValue(
        partiallyRefundedPayment as Payment,
      );

      await expect(
        service.requestRefund(
          mockPaymentId,
          { reason: 'Test', amount: 50 },
          mockUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment is already fully refunded', async () => {
      const fullyRefundedPayment = { ...mockPayment, refundedAmount: 100 };
      paymentRepository.findOne.mockResolvedValue(
        fullyRefundedPayment as Payment,
      );

      await expect(
        service.requestRefund(mockPaymentId, { reason: 'Test' }, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveRefund', () => {
    it('should approve a pending refund successfully', async () => {
      const pendingRefund = {
        ...mockRefund,
        payment: mockPayment,
      };

      refundRepository.findOne
        .mockResolvedValueOnce(pendingRefund as Refund)
        .mockResolvedValueOnce({
          ...pendingRefund,
          status: RefundStatus.SUCCESS,
        } as Refund);

      refundRepository.save.mockResolvedValue({
        ...pendingRefund,
        status: RefundStatus.APPROVED,
      } as Refund);

      refundRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      paymentRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymobService.processRefund.mockResolvedValue({
        id: 'paymob-refund-123',
      });

      const result = await service.approveRefund(mockRefundId, mockAdminId, {
        adminNotes: 'Approved',
      });

      expect(result).toBeDefined();
      expect(refundRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RefundStatus.APPROVED,
          approvedById: mockAdminId,
        }),
      );
    });

    it('should throw NotFoundException if refund not found', async () => {
      refundRepository.findOne.mockResolvedValue(null);

      await expect(
        service.approveRefund(mockRefundId, mockAdminId, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if refund is not pending', async () => {
      const approvedRefund = { ...mockRefund, status: RefundStatus.APPROVED };
      refundRepository.findOne.mockResolvedValue(approvedRefund as Refund);

      await expect(
        service.approveRefund(mockRefundId, mockAdminId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectRefund', () => {
    it('should reject a pending refund successfully', async () => {
      refundRepository.findOne.mockResolvedValue(mockRefund as Refund);
      refundRepository.save.mockResolvedValue({
        ...mockRefund,
        status: RefundStatus.REJECTED,
      } as Refund);

      const result = await service.rejectRefund(mockRefundId, mockAdminId, {
        reason: 'Invalid request',
      });

      expect(result).toBeDefined();
      expect(refundRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: RefundStatus.REJECTED,
          approvedById: mockAdminId,
          adminNotes: 'Invalid request',
        }),
      );
    });

    it('should throw NotFoundException if refund not found', async () => {
      refundRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rejectRefund(mockRefundId, mockAdminId, { reason: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if refund is not pending', async () => {
      const processedRefund = { ...mockRefund, status: RefundStatus.SUCCESS };
      refundRepository.findOne.mockResolvedValue(processedRefund as Refund);

      await expect(
        service.rejectRefund(mockRefundId, mockAdminId, { reason: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processAutomaticRefund', () => {
    it('should create and process an automatic full refund', async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      refundRepository.create.mockReturnValue({
        ...mockRefund,
        isAutomatic: true,
        status: RefundStatus.APPROVED,
      } as Refund);
      refundRepository.save.mockResolvedValue({
        ...mockRefund,
        isAutomatic: true,
        status: RefundStatus.APPROVED,
      } as Refund);
      refundRepository.findOne.mockResolvedValue({
        ...mockRefund,
        status: RefundStatus.SUCCESS,
      } as Refund);
      refundRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymentRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymobService.processRefund.mockResolvedValue({
        id: 'paymob-refund-123',
      });

      const result = await service.processAutomaticRefund(
        mockPaymentId,
        'Order cancelled',
      );

      expect(result).toBeDefined();
      expect(refundRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isAutomatic: true,
          status: RefundStatus.APPROVED,
        }),
      );
    });

    it('should create and process an automatic partial refund', async () => {
      paymentRepository.findOne.mockResolvedValue(mockPayment as Payment);
      refundRepository.create.mockReturnValue({
        ...mockRefund,
        amount: 50,
        refundType: RefundType.PARTIAL,
        isAutomatic: true,
        status: RefundStatus.APPROVED,
      } as Refund);
      refundRepository.save.mockResolvedValue({
        ...mockRefund,
        amount: 50,
        refundType: RefundType.PARTIAL,
        isAutomatic: true,
        status: RefundStatus.APPROVED,
      } as Refund);
      refundRepository.findOne.mockResolvedValue({
        ...mockRefund,
        amount: 50,
        status: RefundStatus.SUCCESS,
      } as Refund);
      refundRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymentRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymobService.processRefund.mockResolvedValue({
        id: 'paymob-refund-123',
      });

      const result = await service.processAutomaticRefund(
        mockPaymentId,
        'Partial refund',
        50,
      );

      expect(result).toBeDefined();
      expect(refundRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50,
          refundType: RefundType.PARTIAL,
        }),
      );
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processAutomaticRefund(mockPaymentId, 'Test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment is not card type', async () => {
      const cashPayment = { ...mockPayment, paymentType: PaymentType.CASH };
      paymentRepository.findOne.mockResolvedValue(cashPayment as Payment);

      await expect(
        service.processAutomaticRefund(mockPaymentId, 'Test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payment is not successful', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentRepository.findOne.mockResolvedValue(pendingPayment as Payment);

      await expect(
        service.processAutomaticRefund(mockPaymentId, 'Test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund exceeds remaining amount', async () => {
      const partiallyRefunded = { ...mockPayment, refundedAmount: 80 };
      paymentRepository.findOne.mockResolvedValue(partiallyRefunded as Payment);

      await expect(
        service.processAutomaticRefund(mockPaymentId, 'Test', 50),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all refunds', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRefund]),
      };

      refundRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.findAll();

      expect(result).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRefund]),
      };

      refundRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.findAll({ status: RefundStatus.PENDING });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'refund.status = :status',
        { status: RefundStatus.PENDING },
      );
    });

    it('should filter by paymentId', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockRefund]),
      };

      refundRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.findAll({ paymentId: mockPaymentId });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'refund.paymentId = :paymentId',
        { paymentId: mockPaymentId },
      );
    });
  });

  describe('findOne', () => {
    it('should return a refund by id', async () => {
      refundRepository.findOne.mockResolvedValue(mockRefund as Refund);

      const result = await service.findOne(mockRefundId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockRefundId);
    });

    it('should throw NotFoundException if refund not found', async () => {
      refundRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockRefundId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
