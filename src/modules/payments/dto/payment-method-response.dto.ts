import { PaymentMethod } from "src/database/entities/payment-method.entity";

export class PaymentMethodResponseDto {
  id: string;
  cardLastFourDigits: string;
  cardBrand: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardHolderName?: string;
  isDefault: boolean;
  isActive: boolean;
  nickname?: string;
  createdAt: Date;

  constructor(paymentMethod: PaymentMethod) {
    this.id = paymentMethod.id;
    this.cardLastFourDigits = paymentMethod.cardLastFourDigits;
    this.cardBrand = paymentMethod.cardBrand;
    this.expiryMonth = paymentMethod.expiryMonth;
    this.expiryYear = paymentMethod.expiryYear;
    this.cardHolderName = paymentMethod.cardHolderName;
    this.isDefault = paymentMethod.isDefault;
    this.isActive = paymentMethod.isActive;
    this.nickname = paymentMethod.nickname;
    this.createdAt = paymentMethod.createdAt;
  }
}
