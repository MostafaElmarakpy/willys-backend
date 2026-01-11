import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsUUID, ValidateNested } from 'class-validator';

export class CategoryReorderItem {
  @IsUUID()
  id: string;

  @IsNumber()
  sortOrder: number;
}

export class ReorderCategoriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryReorderItem)
  categories: CategoryReorderItem[];
}
