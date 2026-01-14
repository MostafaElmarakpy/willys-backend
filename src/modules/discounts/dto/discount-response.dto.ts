import { BilingualStringObject } from "src/common/dto/bilingual-string.dto";
import { DiscountStatus } from "src/common/enums/DiscountStatus";
import { DiscountTargetType } from "src/common/enums/DiscountTargetType";
import { DiscountType } from "src/common/enums/DiscountType";
import { Discount } from "src/database/entities/discount.entity";

export class DiscountResponseDto {
  id: string;
  code?: string;
  name: BilingualStringObject;
  description?: BilingualStringObject;
  type: DiscountType;
  targetType: DiscountTargetType;
  value: number;
  buyQuantity?: number;
  getQuantity?: number;
  freeItemId?: string;
  minimumPurchase?: number;
  maxUsageTotal?: number;
  maxUsagePerUser?: number;
  currentUsageCount: number;
  startDate: Date;
  endDate?: Date;
  status: DiscountStatus;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  remainingUsage?: number;
  isExpired?: boolean;
  isScheduled?: boolean;

  constructor(discount: Partial<Discount>) {
    Object.assign(this, discount);

    if (discount.maxUsageTotal && discount.currentUsageCount !== undefined) {
      this.remainingUsage = discount.maxUsageTotal - discount.currentUsageCount;
    }

    if (discount.endDate) {
      this.isExpired = new Date(discount.endDate) < new Date();
    }

    if (discount.startDate) {
      this.isScheduled = new Date(discount.startDate) > new Date();
    }
  }
}

export class DiscountUsageStatsDto {
  discountId: string;
  totalUsages: number;
  uniqueUsers: number;
  totalAmountSaved: number;
  averageDiscountAmount: number;
}

export class CheckDiscountEligibilityDto {
  isEligible: boolean;
  reason?: string;
  calculatedAmount?: number;
  discount?: DiscountResponseDto;
}

export class DiscountPaginationMetadataDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  activeCount: number;
  inactiveCount: number;
  percentageDiscountsCount: number;
}

export class DiscountPaginationResponseDto {
  discounts: DiscountResponseDto[];
  metadata: DiscountPaginationMetadataDto;
}
