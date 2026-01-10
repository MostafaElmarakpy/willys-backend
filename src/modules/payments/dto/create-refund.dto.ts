import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';

export class CreateRefundDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsNotEmpty()
  @IsString()
  reason: string;
}
