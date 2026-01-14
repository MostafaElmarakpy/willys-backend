import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  CartItemCustomizationDto,
  CartItemExtraDto,
  SelectedVariantDto,
} from "./add-to-cart.dto";

export class UpdateCartItemDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity?: number;

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
