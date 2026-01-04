import { Payment } from 'src/database/entities/payment.entity';
import { PaymentType } from 'src/common/enums/PaymentType';
import { PaymentStatus } from 'src/common/enums/PaymentStatus';

export class PaymentResponseDto {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentType: PaymentType;
  status: PaymentStatus;
  description?: string;
  cardLastFourDigits?: string;
  cardBrand?: string;
  cashReferenceNumber?: string;
  refundedAmount: number;
  paidAt?: Date;
  createdAt: Date;

  constructor(payment: Payment) {
    this.id = payment.id;
    this.transactionId = payment.transactionId;
    this.amount = Number(payment.amount);
    this.currency = payment.currency;
    this.paymentType = payment.paymentType;
    this.status = payment.status;
    this.description = payment.description;
    this.cardLastFourDigits = payment.cardLastFourDigits;
    this.cardBrand = payment.cardBrand;
    this.cashReferenceNumber = payment.cashReferenceNumber;
    this.refundedAmount = Number(payment.refundedAmount);
    this.paidAt = payment.paidAt;
    this.createdAt = payment.createdAt;
  }
}
