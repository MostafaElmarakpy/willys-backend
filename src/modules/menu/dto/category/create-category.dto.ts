import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  BilingualString,
  BilingualStringOptional,
} from 'src/common/dto/bilingual-string.dto';

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
