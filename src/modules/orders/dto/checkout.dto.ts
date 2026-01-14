import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PaymentType } from "src/common/enums/PaymentType";

export class CheckoutDto {
  @IsNotEmpty()
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialInstructions?: string;
}

export class CheckoutSummaryDto {
  cartId: string;
  branchId: string;
  branchName: string;
  orderType: string;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  estimatedTime: number;
  appliedDiscounts: Array<{
    discountId: string;
    code?: string;
    amount: number;
  }>;
}
