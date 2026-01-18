import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { BilingualString } from "src/common/dto/bilingual-string.dto";
import { QuantityType } from "src/common/enums/QuantityType";

export class CreateIngredientDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  quantity?: number = 1;

  @IsOptional()
  @IsEnum(QuantityType)
  quantityType?: QuantityType = QuantityType.PIECE;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean = false;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  stockPercentage?: number = 100;

  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isDefaultExtra?: boolean = false;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  price?: number;
}
