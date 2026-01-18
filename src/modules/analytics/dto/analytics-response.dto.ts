export class OrdersOverTimeDto {
  date: string;
  orders: number;
}

export class RevenueOverTimeDto {
  date: string;
  revenue: number;
}

export class OrderStatusDistributionDto {
  status: string;
  value: number;
}

export class RevenueByCategoryDto {
  categoryId: string;
  category: string;
  revenue: number;
}

export class CustomerSegmentDto {
  segment: string;
  value: number;
}

export class DashboardAnalyticsDto {
  ordersOverTime: OrdersOverTimeDto[];
  revenueOverTime: RevenueOverTimeDto[];
  orderStatusDistribution: OrderStatusDistributionDto[];
  revenueByCategory: RevenueByCategoryDto[];
  customerSegments: CustomerSegmentDto[];
}
