export class PaymentSuccessEvent {
  constructor(
    public readonly paymentId: string,
    public readonly transactionId: string,
    public readonly amount: number,
    public readonly customerName: string,
    public readonly orderId?: string,
    public readonly orderNumber?: string,
  ) {}
}

export class PaymentFailedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly transactionId: string,
    public readonly amount: number,
    public readonly customerName: string,
    public readonly errorMessage?: string,
  ) {}
}

export class PaymentRefundedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly refundId: string,
    public readonly originalAmount: number,
    public readonly refundAmount: number,
    public readonly customerName: string,
    public readonly orderNumber?: string,
  ) {}
}
