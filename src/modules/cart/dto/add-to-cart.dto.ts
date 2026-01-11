import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BilingualString,
  BilingualStringObject,
} from 'src/common/dto/bilingual-string.dto';

export class SelectedVariantDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  value: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}

export class CartItemCustomizationDto {
  @IsNotEmpty()
  @IsUUID()
  ingredientId: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualStringObject;

  @IsNotEmpty()
  @IsEnum(['ADD', 'REMOVE', 'EXTRA'])
  action: 'ADD' | 'REMOVE' | 'EXTRA';

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class CartItemExtraDto {
  @IsNotEmpty()
  @IsUUID()
  ingredientId: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualStringObject;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class AddToCartDto {
  @ValidateIf((o) => !o.bundleId)
  @IsNotEmpty({ message: 'Either itemId or bundleId is required' })
  @IsUUID()
  itemId?: string;

  @ValidateIf((o) => !o.itemId)
  @IsNotEmpty({ message: 'Either itemId or bundleId is required' })
  @IsUUID()
  bundleId?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectedVariantDto)
  selectedVariant?: SelectedVariantDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemCustomizationDto)
  customizations?: CartItemCustomizationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemExtraDto)
  extras?: CartItemExtraDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialInstructions?: string;
}
