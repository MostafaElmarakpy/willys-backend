import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class RegisterFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  token: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  deviceId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  deviceType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  userAgent?: string;
}
