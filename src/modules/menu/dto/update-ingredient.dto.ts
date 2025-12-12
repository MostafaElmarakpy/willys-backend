import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateIngredientDto } from './create-ingredient.dto';

export class UpdateIngredientDto extends PartialType(
  OmitType(CreateIngredientDto, ['categoryId'] as const)
) {}