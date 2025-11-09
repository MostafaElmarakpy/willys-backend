import { IsNotEmpty, IsString } from 'class-validator';

export class ResendVerificationEmailDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  callbackUrl: string;
}
