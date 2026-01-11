import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ApplyDiscountDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  code: string;
}
