import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  BilingualString,
  BilingualStringOptional,
} from 'src/common/dto/bilingual-string.dto';
import { ItemStatus } from 'src/common/enums/ItemStatus';
import {
  ItemExtra,
  ItemIngredient,
  PricingObject,
  transformPricing,
} from './pricing.dto';

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
  @Transform(transformPricing)
  pricing: PricingObject | string | number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemIngredient)
  ingredients?: ItemIngredient[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemExtra)
  extras?: ItemExtra[];

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
