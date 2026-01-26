import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  @IsOptional()
  orderNew?: boolean;

  @IsBoolean()
  @IsOptional()
  orderStatusChanged?: boolean;

  @IsBoolean()
  @IsOptional()
  userRegistered?: boolean;

  @IsBoolean()
  @IsOptional()
  paymentSuccess?: boolean;

  @IsBoolean()
  @IsOptional()
  paymentFailed?: boolean;

  @IsBoolean()
  @IsOptional()
  paymentRefunded?: boolean;

  @IsBoolean()
  @IsOptional()
  pushEnabled?: boolean;
}
