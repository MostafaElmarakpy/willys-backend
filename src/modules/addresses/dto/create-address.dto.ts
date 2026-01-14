import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  BilingualString,
  type BilingualStringObject,
} from "src/common/dto/bilingual-string.dto";
import { AddressType } from "src/common/enums/AddressType";

export class CreateAddressDto {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => BilingualString)
  label: BilingualStringObject;

  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  addressLine1: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
