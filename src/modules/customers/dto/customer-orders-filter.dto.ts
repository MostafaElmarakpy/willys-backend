import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { OrderStatus } from "src/common/enums/OrderStatus";
import { OrderType } from "src/common/enums/OrderType";

export class CustomerOrdersFilterDto {
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Page must be an integer" })
  @Min(1, { message: "Page must be at least 1" })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "Limit must be an integer" })
  @Min(1, { message: "Limit must be at least 1" })
  @Max(100, { message: "Limit cannot exceed 100" })
  limit?: number = 10;

  @IsOptional()
  @IsIn(["createdAt", "total", "status"])
  sortBy?: string = "createdAt";

  @IsOptional()
  @IsIn(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "DESC";
}
