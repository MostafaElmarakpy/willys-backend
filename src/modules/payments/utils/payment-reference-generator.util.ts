import { randomBytes } from "node:crypto";

export class PaymentReferenceGenerator {
  static generateTransactionId(): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString("hex").toUpperCase();
    return `PAY-${timestamp}-${random}`;
  }

  static generateMerchantOrderId(): string {
    const timestamp = Date.now();
    const random = randomBytes(6).toString("hex").toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  static generateCashReferenceNumber(): string {
    const timestamp = Date.now();
    const random = randomBytes(3).toString("hex").toUpperCase();
    return `CASH-${timestamp}-${random}`;
  }

  static generateRefundId(): string {
    const timestamp = Date.now();
    const random = randomBytes(4).toString("hex").toUpperCase();
    return `REF-${timestamp}-${random}`;
  }
}
