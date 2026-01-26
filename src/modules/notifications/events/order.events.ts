export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly userId: string,
    public readonly customerName: string,
    public readonly total: number,
    public readonly branchId: string,
    public readonly branchName: string,
    public readonly orderType: string,
  ) {}
}

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly orderNumber: string,
    public readonly previousStatus: string,
    public readonly newStatus: string,
    public readonly customerName: string,
  ) {}
}
