import {
  IsOptional,
  IsEnum,
  IsString,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DiscountType } from 'src/common/enums/DiscountType';
import { DiscountStatus } from 'src/common/enums/DiscountStatus';
import { DiscountTargetType } from 'src/common/enums/DiscountTargetType';

export class DiscountFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DiscountStatus)
  status?: DiscountStatus;

  @IsOptional()
  @IsEnum(DiscountType)
  type?: DiscountType;

  @IsOptional()
  @IsEnum(DiscountTargetType)
  targetType?: DiscountTargetType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minValue?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxValue?: number;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'startDate', 'value', 'status'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
