import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { NotificationType } from "src/common/enums/NotificationType";

export class NotificationFilterDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  isRead?: boolean;
}
