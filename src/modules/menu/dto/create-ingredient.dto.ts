import { IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualString } from 'src/common/dto/bilingual-string.dto';

export class CreateIngredientDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  quantity: number;

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
}