import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsInt,
  ValidateIf,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { BilingualString } from 'src/common/dto/bilingual-string.dto';
import { DiscountType } from 'src/common/enums/DiscountType';
import { DiscountStatus } from 'src/common/enums/DiscountStatus';
import { DiscountTargetType } from 'src/common/enums/DiscountTargetType';

export class CreateDiscountDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualString)
  description?: BilingualString;

  @IsNotEmpty()
  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNotEmpty()
  @IsEnum(DiscountTargetType)
  targetType: DiscountTargetType;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ValidateIf((o) => o.type === DiscountType.PERCENTAGE)
  @Min(0)
  @Max(100)
  value: number;

  @ValidateIf((o) => o.type === DiscountType.BUY_X_GET_Y)
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  buyQuantity?: number;

  @ValidateIf((o) => o.type === DiscountType.BUY_X_GET_Y)
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  getQuantity?: number;

  @ValidateIf((o) => o.type === DiscountType.FREE_ITEM)
  @IsNotEmpty()
  @IsUUID()
  freeItemId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minimumPurchase?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  maxUsageTotal?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  maxUsagePerUser?: number;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(DiscountStatus)
  status?: DiscountStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
