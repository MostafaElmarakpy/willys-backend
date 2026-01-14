import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PaymentEventType } from "src/common/enums/PaymentEventType";
import { PaymentStatus } from "src/common/enums/PaymentStatus";
import { PaymentType } from "src/common/enums/PaymentType";
import { Payment } from "src/database/entities/payment.entity";
import { PaymentTransactionLog } from "src/database/entities/payment-transaction-log.entity";
import { Repository } from "typeorm";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { CreatePaymentResponseDto } from "./dto/create-payment-response.dto";
import { PaymentFilterDto } from "./dto/payment-filter.dto";
import { PaymentResponseDto } from "./dto/payment-response.dto";
import { PaymobWebhookPayload } from "./interfaces/paymob-webhook-payload.interface";
import { PaymobService } from "./paymob.service";
import { PaymentReferenceGenerator } from "./utils/payment-reference-generator.util";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentTransactionLog)
    readonly transactionLogRepository: Repository<PaymentTransactionLog>,
    private readonly paymobService: PaymobService,
  ) {}

  async createPayment(
    dto: CreatePaymentDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Payment> {
    // Check for duplicate merchantOrderId (idempotency)
    if (dto.merchantOrderId) {
      const existing = await this.paymentRepository.findOne({
        where: { merchantOrderId: dto.merchantOrderId, userId },
      });

      if (existing) {
        this.logger.warn(
          `Duplicate payment attempt with merchantOrderId: ${dto.merchantOrderId}`,
        );
        throw new BadRequestException(
          "Payment with this order ID already exists",
        );
      }
    }

    const transactionId = PaymentReferenceGenerator.generateTransactionId();

    const payment = this.paymentRepository.create({
      transactionId,
      amount: dto.amount,
      currency: "EGP",
      paymentType: dto.paymentType,
      status: PaymentStatus.PENDING,
      userId,
      paymentMethodId: dto.paymentMethodId,
      description: dto.description,
      merchantOrderId:
        dto.merchantOrderId ||
        PaymentReferenceGenerator.generateMerchantOrderId(),
      metadata: dto.metadata,
      ipAddress,
      userAgent,
      isRefundable: dto.paymentType === PaymentType.CARD,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    await this.logTransaction(
      savedPayment.id,
      PaymentEventType.CREATED,
      PaymentStatus.PENDING,
      PaymentStatus.PENDING,
      { amount: dto.amount, paymentType: dto.paymentType },
      ipAddress,
    );

    this.logger.log(`Payment created: ${transactionId}`);
    return savedPayment;
  }

  async processCardPayment(
    paymentId: string,
    userId: string,
    billingData?: any,
  ): Promise<CreatePaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.paymentType !== PaymentType.CARD) {
      throw new BadRequestException("Payment type must be CARD");
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        "Payment has already been processed or is in invalid state",
      );
    }

    try {
      // Step 1: Get auth token
      const authToken = await this.paymobService.authenticate();

      // Step 2: Create Paymob order
      const paymobOrder = await this.paymobService.createOrder(
        payment.amount,
        payment.currency,
        payment.merchantOrderId!,
      );

      // Step 3: Create payment key
      const paymentKeyResponse = await this.paymobService.createPaymentKey(
        authToken,
        paymobOrder.id,
        userId,
        payment.amount,
        billingData,
      );

      // Step 4: Build iframe URL
      const iframeUrl = this.paymobService.buildIframeUrl(
        paymentKeyResponse.token,
      );

      // Update payment with Paymob details
      payment.paymobOrderId = String(paymobOrder.id);
      payment.paymobPaymentKey = paymentKeyResponse.token;
      payment.paymobIframeUrl = iframeUrl;
      payment.status = PaymentStatus.PROCESSING;

      await this.paymentRepository.save(payment);

      await this.logTransaction(
        payment.id,
        PaymentEventType.PROCESSING,
        PaymentStatus.PENDING,
        PaymentStatus.PROCESSING,
        { paymobOrderId: paymobOrder.id },
        payment.ipAddress,
      );

      this.logger.log(
        `Card payment processing initiated: ${payment.transactionId}`,
      );

      return {
        payment: new PaymentResponseDto(payment),
        iframeUrl,
      };
    } catch (error) {
      this.logger.error("Failed to process card payment", error);

      payment.status = PaymentStatus.FAILED;
      payment.errorMessage = error.message;
      payment.failedAt = new Date();
      await this.paymentRepository.save(payment);

      await this.logTransaction(
        payment.id,
        PaymentEventType.FAILED,
        PaymentStatus.PROCESSING,
        PaymentStatus.FAILED,
        { error: error.message },
        payment.ipAddress,
      );

      throw error;
    }
  }

  async processCashPayment(
    paymentId: string,
    userId: string,
  ): Promise<CreatePaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.paymentType !== PaymentType.CASH) {
      throw new BadRequestException("Payment type must be CASH");
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        "Payment has already been processed or is in invalid state",
      );
    }

    const cashReference =
      PaymentReferenceGenerator.generateCashReferenceNumber();

    payment.cashReferenceNumber = cashReference;
    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = new Date();

    await this.paymentRepository.save(payment);

    await this.logTransaction(
      payment.id,
      PaymentEventType.SUCCESS,
      PaymentStatus.PENDING,
      PaymentStatus.SUCCESS,
      { cashReferenceNumber: cashReference },
      payment.ipAddress,
    );

    this.logger.log(`Cash payment processed: ${payment.transactionId}`);

    return {
      payment: new PaymentResponseDto(payment),
      cashReferenceNumber: cashReference,
    };
  }

  async handleWebhookUpdate(webhookData: PaymobWebhookPayload): Promise<void> {
    const merchantOrderId = webhookData.obj.order.merchant_order_id;

    const payment = await this.paymentRepository.findOne({
      where: { merchantOrderId },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for webhook: ${merchantOrderId}`);
      return;
    }

    const previousStatus = payment.status;

    if (webhookData.obj.success === true && !webhookData.obj.pending) {
      payment.status = PaymentStatus.SUCCESS;
      payment.paymobTransactionId = String(webhookData.obj.id);
      payment.cardLastFourDigits = webhookData.obj.source_data.pan
        ? webhookData.obj.source_data.pan.slice(-4)
        : undefined;
      payment.cardBrand = webhookData.obj.source_data.sub_type;
      payment.paidAt = new Date();
      payment.paymobResponse = webhookData.obj;

      await this.paymentRepository.save(payment);

      await this.logTransaction(
        payment.id,
        PaymentEventType.SUCCESS,
        previousStatus,
        PaymentStatus.SUCCESS,
        { paymobTransactionId: webhookData.obj.id },
      );

      this.logger.log(
        `Payment successful via webhook: ${payment.transactionId}`,
      );
    } else if (webhookData.obj.success === false) {
      payment.status = PaymentStatus.FAILED;
      payment.errorMessage = webhookData.obj.data?.message || "Payment failed";
      payment.failedAt = new Date();
      payment.paymobResponse = webhookData.obj;

      await this.paymentRepository.save(payment);

      await this.logTransaction(
        payment.id,
        PaymentEventType.FAILED,
        previousStatus,
        PaymentStatus.FAILED,
        { error: payment.errorMessage },
      );

      this.logger.warn(`Payment failed via webhook: ${payment.transactionId}`);
    }

    await this.logTransaction(
      payment.id,
      PaymentEventType.WEBHOOK_RECEIVED,
      previousStatus,
      payment.status,
      webhookData.obj,
    );
  }

  async findAll(filterDto: PaymentFilterDto): Promise<any> {
    const {
      page = 1,
      limit = 20,
      status,
      paymentType,
      userId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = filterDto;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.user", "user");

    if (status) {
      queryBuilder.andWhere("payment.status = :status", { status });
    }

    if (paymentType) {
      queryBuilder.andWhere("payment.paymentType = :paymentType", {
        paymentType,
      });
    }

    if (userId) {
      queryBuilder.andWhere("payment.userId = :userId", { userId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere(
        "payment.createdAt BETWEEN :startDate AND :endDate",
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      );
    } else if (startDate) {
      queryBuilder.andWhere("payment.createdAt >= :startDate", {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere("payment.createdAt <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    if (minAmount) {
      queryBuilder.andWhere("payment.amount >= :minAmount", { minAmount });
    }

    if (maxAmount) {
      queryBuilder.andWhere("payment.amount <= :maxAmount", { maxAmount });
    }

    const skip = (page - 1) * limit;

    const [payments, total] = await queryBuilder
      .orderBy("payment.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: payments.map((payment) => new PaymentResponseDto(payment)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<Payment> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const payment = await this.paymentRepository.findOne({
      where,
      relations: ["user", "transactionLogs", "refunds"],
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async findByTransactionId(transactionId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    metadata?: any,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    const previousStatus = payment.status;
    payment.status = status;

    if (metadata) {
      Object.assign(payment, metadata);
    }

    await this.paymentRepository.save(payment);

    await this.logTransaction(
      payment.id,
      PaymentEventType.STATUS_CHANGED,
      previousStatus,
      status,
      metadata,
    );

    return payment;
  }

  async getPaymentStatistics(): Promise<any> {
    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      totalAmount,
      refundedAmount,
      cashPayments,
      cardPayments,
    ] = await Promise.all([
      this.paymentRepository.count(),
      this.paymentRepository.count({
        where: { status: PaymentStatus.SUCCESS },
      }),
      this.paymentRepository.count({ where: { status: PaymentStatus.FAILED } }),
      this.paymentRepository
        .createQueryBuilder("payment")
        .select("SUM(payment.amount)", "total")
        .where("payment.status = :status", { status: PaymentStatus.SUCCESS })
        .getRawOne()
        .then((result) => Number(result?.total || 0)),
      this.paymentRepository
        .createQueryBuilder("payment")
        .select("SUM(payment.refundedAmount)", "total")
        .getRawOne()
        .then((result) => Number(result?.total || 0)),
      this.paymentRepository.count({
        where: { paymentType: PaymentType.CASH },
      }),
      this.paymentRepository.count({
        where: { paymentType: PaymentType.CARD },
      }),
    ]);

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      totalAmount,
      refundedAmount,
      cashPayments,
      cardPayments,
    };
  }

  private async logTransaction(
    paymentId: string,
    eventType: PaymentEventType,
    previousStatus: PaymentStatus,
    newStatus: PaymentStatus,
    eventData?: any,
    ipAddress?: string,
  ): Promise<void> {
    const log = this.transactionLogRepository.create({
      paymentId,
      eventType,
      previousStatus,
      newStatus,
      eventData,
      ipAddress,
    });

    await this.transactionLogRepository.save(log);
  }
}
