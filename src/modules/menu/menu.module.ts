import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from 'src/config/config.module';
import { Category } from 'src/database/entities/category.entity';
import { Item } from 'src/database/entities/item.entity';
import { Variant } from 'src/database/entities/variant.entity';
import { VariantValue } from 'src/database/entities/variant-value.entity';
import { Ingredient } from 'src/database/entities/ingredient.entity';
import { IngredientCategory } from 'src/database/entities/ingredient-category.entity';
import { CategoriesService } from './categories.service';
import { ItemsService } from './items.service';
import { VariantsService } from './variants.service';
import { IngredientsService } from './ingredients.service';
import { CategoriesAdminController } from './categories-admin.controller';
import { ItemsAdminController } from './items-admin.controller';
import { VariantsAdminController } from './variants-admin.controller';
import { IngredientsAdminController } from './ingredients-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Item,
      Variant,
      VariantValue,
      Ingredient,
      IngredientCategory,
    ]),
    ConfigModule,
  ],
  controllers: [
    CategoriesAdminController,
    ItemsAdminController,
    VariantsAdminController,
    IngredientsAdminController,
  ],
  providers: [
    CategoriesService,
    ItemsService,
    VariantsService,
    IngredientsService,
  ],
  exports: [
    CategoriesService,
    ItemsService,
    VariantsService,
    IngredientsService,
  ],
})
export class MenuModule {}