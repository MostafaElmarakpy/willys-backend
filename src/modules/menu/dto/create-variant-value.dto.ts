import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualString } from 'src/common/dto/bilingual-string.dto';

export class CreateVariantValueDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  price: number;

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
