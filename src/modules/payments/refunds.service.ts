import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Refund } from 'src/database/entities/refund.entity';
import { Payment } from 'src/database/entities/payment.entity';
import { RefundType } from 'src/common/enums/RefundType';
import { RefundStatus } from 'src/common/enums/RefundStatus';
import { PaymentStatus } from 'src/common/enums/PaymentStatus';
import { PaymentType } from 'src/common/enums/PaymentType';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ApproveRefundDto } from './dto/approve-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { RefundResponseDto } from './dto/refund-response.dto';
import { PaymentReferenceGenerator } from './utils/payment-reference-generator.util';
import { PaymobService } from './paymob.service';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly paymobService: PaymobService,
  ) {}

  async requestRefund(
    paymentId: string,
    dto: CreateRefundDto,
    userId: string,
  ): Promise<RefundResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (!payment.isRefundable) {
      throw new BadRequestException('This payment is not refundable');
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Only successful payments can be refunded');
    }

    // Calculate refund amount
    const refundAmount = dto.amount || payment.amount;
    const remainingAmount = Number(payment.amount) - Number(payment.refundedAmount);

    if (refundAmount > remainingAmount) {
      throw new BadRequestException(
        `Refund amount cannot exceed remaining amount: ${remainingAmount}`,
      );
    }

    if (remainingAmount === 0) {
      throw new BadRequestException('Payment has already been fully refunded');
    }

    const refundType =
      refundAmount === Number(payment.amount)
        ? RefundType.FULL
        : RefundType.PARTIAL;

    const refundId = PaymentReferenceGenerator.generateRefundId();

    const refund = this.refundRepository.create({
      refundId,
      paymentId: payment.id,
      amount: refundAmount,
      refundType,
      status: RefundStatus.PENDING,
      reason: dto.reason,
      requestedById: userId,
      isAutomatic: false,
    });

    const saved = await this.refundRepository.save(refund);

    this.logger.log(`Refund requested: ${refundId} for payment ${payment.transactionId}`);

    return new RefundResponseDto(saved);
  }

  async approveRefund(
    refundId: string,
    adminId: string,
    dto: ApproveRefundDto,
  ): Promise<RefundResponseDto> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
      relations: ['payment'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(
        'Only pending refunds can be approved',
      );
    }

    refund.status = RefundStatus.APPROVED;
    refund.approvedById = adminId;
    refund.approvedAt = new Date();
    refund.adminNotes = dto.adminNotes;

    await this.refundRepository.save(refund);

    this.logger.log(`Refund approved: ${refund.refundId} by admin ${adminId}`);

    // Process the refund immediately
    await this.processRefundWithPaymob(refund);

    const updated = await this.refundRepository.findOne({
      where: { id: refundId },
    });

    if (!updated) {
      throw new NotFoundException('Refund not found after approval');
    }

    return new RefundResponseDto(updated);
  }

  async rejectRefund(
    refundId: string,
    adminId: string,
    dto: RejectRefundDto,
  ): Promise<RefundResponseDto> {
    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(
        'Only pending refunds can be rejected',
      );
    }

    refund.status = RefundStatus.REJECTED;
    refund.approvedById = adminId;
    refund.approvedAt = new Date();
    refund.adminNotes = dto.reason;

    await this.refundRepository.save(refund);

    this.logger.log(`Refund rejected: ${refund.refundId} by admin ${adminId}`);

    return new RefundResponseDto(refund);
  }

  async processAutomaticRefund(
    paymentId: string,
    reason: string,
    amount?: number,
  ): Promise<RefundResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.paymentType !== PaymentType.CARD) {
      throw new BadRequestException('Only card payments can be automatically refunded');
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Only successful payments can be refunded');
    }

    const refundAmount = amount || payment.amount;
    const remainingAmount = Number(payment.amount) - Number(payment.refundedAmount);

    if (refundAmount > remainingAmount) {
      throw new BadRequestException(
        `Refund amount cannot exceed remaining amount: ${remainingAmount}`,
      );
    }

    const refundType =
      refundAmount === Number(payment.amount)
        ? RefundType.FULL
        : RefundType.PARTIAL;

    const refundId = PaymentReferenceGenerator.generateRefundId();

    const refund = this.refundRepository.create({
      refundId,
      paymentId: payment.id,
      amount: refundAmount,
      refundType,
      status: RefundStatus.APPROVED,
      reason,
      requestedById: payment.userId,
      approvedById: payment.userId,
      approvedAt: new Date(),
      isAutomatic: true,
    });

    const saved = await this.refundRepository.save(refund);

    this.logger.log(`Automatic refund created: ${refundId} for payment ${payment.transactionId}`);

    // Process immediately
    await this.processRefundWithPaymob(saved);

    const updated = await this.refundRepository.findOne({
      where: { id: saved.id },
    });

    if (!updated) {
      throw new NotFoundException('Refund not found after processing');
    }

    return new RefundResponseDto(updated);
  }

  async findAll(filters?: any): Promise<RefundResponseDto[]> {
    const queryBuilder = this.refundRepository
      .createQueryBuilder('refund')
      .leftJoinAndSelect('refund.payment', 'payment')
      .leftJoinAndSelect('refund.requestedBy', 'requestedBy')
      .leftJoinAndSelect('refund.approvedBy', 'approvedBy');

    if (filters?.status) {
      queryBuilder.andWhere('refund.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.paymentId) {
      queryBuilder.andWhere('refund.paymentId = :paymentId', {
        paymentId: filters.paymentId,
      });
    }

    const refunds = await queryBuilder
      .orderBy('refund.createdAt', 'DESC')
      .getMany();

    return refunds.map((refund) => new RefundResponseDto(refund));
  }

  async findOne(id: string): Promise<Refund> {
    const refund = await this.refundRepository.findOne({
      where: { id },
      relations: ['payment', 'requestedBy', 'approvedBy'],
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    return refund;
  }

  private async processRefundWithPaymob(refund: Refund): Promise<void> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: refund.paymentId },
      });

      if (!payment || !payment.paymobTransactionId) {
        throw new BadRequestException(
          'Payment does not have a valid Paymob transaction ID',
        );
      }

      // Update status to processing
      await this.refundRepository.update(refund.id, {
        status: RefundStatus.PROCESSING,
        processedAt: new Date(),
      });

      // Call Paymob refund API
      const amountCents = Math.round(Number(refund.amount) * 100);
      const paymobResponse = await this.paymobService.processRefund(
        payment.paymobTransactionId,
        amountCents,
      );

      // Update refund status to success
      await this.refundRepository.update(refund.id, {
        status: RefundStatus.SUCCESS,
        paymobRefundId: String(paymobResponse.id),
        paymobResponse,
        completedAt: new Date(),
      });

      // Update payment refunded amount and status
      const newRefundedAmount = Number(payment.refundedAmount) + Number(refund.amount);
      const newStatus =
        newRefundedAmount >= Number(payment.amount)
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED;

      await this.paymentRepository.update(payment.id, {
        refundedAmount: newRefundedAmount,
        status: newStatus,
        refundedAt: newStatus === PaymentStatus.REFUNDED ? new Date() : payment.refundedAt,
      });

      this.logger.log(`Refund processed successfully: ${refund.refundId}`);
    } catch (error) {
      this.logger.error(`Refund processing failed: ${refund.refundId}`, error);

      await this.refundRepository.update(refund.id, {
        status: RefundStatus.FAILED,
        errorMessage: error.message,
      });

      throw error;
    }
  }
}
