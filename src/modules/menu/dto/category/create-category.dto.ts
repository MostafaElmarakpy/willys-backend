import { Type } from "class-transformer";
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import {
  BilingualString,
  BilingualStringOptional,
} from "src/common/dto/bilingual-string.dto";

export class CreateCategoryDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualStringOptional)
  description?: BilingualStringOptional;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
