import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEmail,
  ValidateNested,
  Min,
  Max,
  Matches,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualString } from '../../../common/dto/bilingual-string.dto';

export class CreateBranchDto {
  @ValidateNested({
    message: 'Branch name must be provided in both Arabic and English',
  })
  @Type(() => BilingualString)
  name: BilingualString;

  @IsString({ message: 'Address must be a valid string' })
  @IsNotEmpty({ message: 'Address is required and cannot be empty' })
  address: string;

  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Max(90, { message: 'Latitude must be between -90 and 90 degrees' })
  @Type(() => Number)
  latitude: number;

  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Max(180, { message: 'Longitude must be between -180 and 180 degrees' })
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsString({ message: 'Phone number must be a valid string' })
  @IsPhoneNumber(undefined, {
    message:
      'Phone number must be in valid international format (e.g. +1234567890)',
  })
  phone?: string;

  @IsOptional()
  @IsEmail(
    {},
    { message: 'Email must be in valid format (e.g. example@domain.com)' },
  )
  email?: string;

  @IsOptional()
  @IsBoolean({ message: 'Active status must be true or false' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Open status must be true or false' })
  isOpen?: boolean;

  @IsOptional()
  @IsString({ message: 'Opening hours must be a valid string' })
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/, {
    message: 'Opening hours must be in HH:MM format (e.g. 09:00)',
  })
  openingHours?: string;

  @IsOptional()
  @IsString({ message: 'Closing hours must be a valid string' })
  @Matches(/^([01]?\d|2[0-3]):[0-5]\d$/, {
    message: 'Closing hours must be in HH:MM format (e.g. 21:00)',
  })
  closingHours?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Delivery fee must be a valid number' })
  @Min(0, { message: 'Delivery fee cannot be negative' })
  @Type(() => Number)
  deliveryFee?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Estimated delivery time must be a valid number' })
  @Min(1, { message: 'Estimated delivery time must be at least 1 minute' })
  @Max(480, {
    message: 'Estimated delivery time cannot exceed 8 hours (480 minutes)',
  })
  @Type(() => Number)
  estimatedDeliveryTime?: number;
}
