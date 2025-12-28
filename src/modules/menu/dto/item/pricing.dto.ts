import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export function transformPricing({ value }: { value: any }) {
  // If it's already an object with type field, keep it as is
  if (typeof value === 'object' && value !== null && value.type) {
    return value;
  }

  // If it's a string or number, just return it as is
  // The service layer will handle the conversion
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return value;
}

export class PricingVariantValue {
  @IsNotEmpty()
  @IsString()
  value: string;

  @IsNotEmpty()
  @IsString()
  price: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;
}

export class PricingVariant {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sortOrder?: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingVariantValue)
  values: PricingVariantValue[];
}

export class PricingObject {
  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingVariant)
  variants?: PricingVariant[];

  @IsNotEmpty()
  @IsString()
  @IsIn(['number', 'object'])
  type: 'number' | 'object';
}

export class Pricing {
  @Transform(transformPricing)
  pricing: string | PricingObject;
}

export class ItemIngredient {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  quantity: string;
}

export class ItemExtra {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  quantity: string;
}

export class BundledItem {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  quantity: string;
}

