import { IsNotEmpty, IsOptional, IsNumber, IsString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualString, BilingualStringOptional } from 'src/common/dto/bilingual-string.dto';
import { ItemStatus } from 'src/common/enums/ItemStatus';

export class CreateItemDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualStringOptional)
  description?: BilingualStringOptional;

  @IsOptional()
  @IsString()
  image?: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus = ItemStatus.DRAFT;

  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;

  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variantIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ingredientIds?: string[];
}