import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

export enum LastOrderFilter {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_7_DAYS = "last7days",
  LAST_30_DAYS = "last30days",
}

export enum CustomerSortBy {
  NEWEST_ORDER = "newestOrder",
  OLDEST_ORDER = "oldestOrder",
  HIGHEST_SPENT = "highestSpent",
  LOWEST_SPENT = "lowestSpent",
  MOST_ORDERS = "mostOrders",
  LEAST_ORDERS = "leastOrders",
  CREATED_AT = "createdAt",
}

export class CustomerFilterDto {
  @IsOptional()
  @IsEnum(LastOrderFilter)
  lastOrderFilter?: LastOrderFilter;

  @IsOptional()
  @IsString()
  search?: string;

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
  @IsEnum(CustomerSortBy)
  sortBy?: CustomerSortBy = CustomerSortBy.NEWEST_ORDER;

  @IsOptional()
  @IsIn(["ASC", "DESC"])
  sortOrder?: "ASC" | "DESC" = "DESC";
}
