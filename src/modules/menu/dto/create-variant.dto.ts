import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualString } from 'src/common/dto/bilingual-string.dto';
import { VariantType } from 'src/common/enums/VariantType';

export class CreateVariantDto {
  @ValidateNested()
  @Type(() => BilingualString)
  name: BilingualString;

  @IsOptional()
  @IsEnum(VariantType)
  type?: VariantType = VariantType.DEFAULT;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsNumber()
  sortOrder?: number = 0;
}
