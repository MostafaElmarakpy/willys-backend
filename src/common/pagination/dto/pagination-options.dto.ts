import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class BasePaginationOptionsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsString()
  search: string;

  @IsOptional()
  @IsString()
  searchField: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  relationFilterBy?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsString({ each: true })
  relationFilterValue?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  simple?: boolean = false;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hiddenRelationFilterBy?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  simpleSelectFields?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  whereHas?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  exactMatchOnly?: boolean = false;
}

export class PaginationOptionsDto extends BasePaginationOptionsDto {}
