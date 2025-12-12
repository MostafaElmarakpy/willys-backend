import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualString } from '../../../common/dto/bilingual-string.dto';

export class CreateBranchDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsString()
  openingHours?: string;

  @IsOptional()
  @IsString()
  closingHours?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedDeliveryTime?: number;
}
