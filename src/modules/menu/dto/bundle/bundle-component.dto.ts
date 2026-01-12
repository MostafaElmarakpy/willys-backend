import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBundleComponentItemDto {
  @IsNotEmpty()
  @IsString()
  itemId: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  extraCost: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
}

export class CreateBundleComponentDto {
  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  defaultItemId: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBundleComponentItemDto)
  items: CreateBundleComponentItemDto[];
}

export class UpdateBundleComponentItemDto {
  @IsNotEmpty()
  @IsString()
  itemId: string;

  @IsNotEmpty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  extraCost: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
}

export class UpdateBundleComponentDto {
  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsNotEmpty()
  @IsString()
  defaultItemId: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBundleComponentItemDto)
  items: UpdateBundleComponentItemDto[];
}
