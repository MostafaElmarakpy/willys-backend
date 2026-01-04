import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { PaymentType } from 'src/common/enums/PaymentType';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  merchantOrderId?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @ValidateIf((o) => o.paymentType === PaymentType.CARD)
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsBoolean()
  saveCard?: boolean;
}
