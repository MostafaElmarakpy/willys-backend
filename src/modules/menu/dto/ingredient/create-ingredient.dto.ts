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

export class CreateIngredientDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsEnum(QuantityType)
  quantityType?: QuantityType = QuantityType.PIECE;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean = false;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  stockPercentage: number;

  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isDefaultExtra?: boolean = false;
}
