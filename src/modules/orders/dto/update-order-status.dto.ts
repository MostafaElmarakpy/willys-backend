import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { OrderStatus } from 'src/common/enums/OrderStatus';

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CancelOrderDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason: string;
}
