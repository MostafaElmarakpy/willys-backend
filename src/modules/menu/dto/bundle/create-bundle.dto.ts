import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BilingualString,
  BilingualStringOptional,
} from 'src/common/dto/bilingual-string.dto';
import { BundleStatus } from 'src/common/enums/BundleStatus';
import { ItemExtra, BundledItem } from '../item/pricing.dto';

export class CreateBundleDto {
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
  @IsString()
  categoryId: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsEnum(BundleStatus)
  status?: BundleStatus = BundleStatus.DRAFT;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundledItem)
  items?: BundledItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemExtra)
  extras?: ItemExtra[];
}
