import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualString } from 'src/common/dto/bilingual-string.dto';
import { QuantityType } from 'src/common/enums/QuantityType';

export class CreateVariantValueDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsEnum(QuantityType)
  quantityType?: QuantityType;

  @IsNotEmpty()
  @IsString()
  variantId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;
}
