import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  Length,
} from 'class-validator';

export class SavePaymentMethodDto {
  @IsNotEmpty()
  @IsString()
  paymobToken: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 4)
  cardLastFourDigits: string;

  @IsNotEmpty()
  @IsString()
  cardBrand: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  expiryMonth?: string;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  expiryYear?: string;

  @IsOptional()
  @IsString()
  cardHolderName?: string;

  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
