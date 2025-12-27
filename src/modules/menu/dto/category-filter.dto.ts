import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export enum CategoryOrderBy {
  SORT_ORDER = 'sortOrder',
  UPDATED_AT = 'updatedAt',
  ITEMS_COUNT = 'itemsCount',
}

export class CategoryFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsEnum(CategoryOrderBy)
  sortBy?: CategoryOrderBy = CategoryOrderBy.SORT_ORDER;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
