import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  ValidateNested,
} from "class-validator";
import {
  BilingualString,
  BilingualStringOptional,
} from "src/common/dto/bilingual-string.dto";

export class CreateIngredientCategoryDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualStringOptional)
  description?: BilingualStringOptional;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;
}
