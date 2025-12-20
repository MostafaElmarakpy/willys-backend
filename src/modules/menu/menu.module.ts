import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from 'src/config/config.module';
import { Category } from 'src/database/entities/category.entity';
import { Item } from 'src/database/entities/item.entity';
import { Bundle } from 'src/database/entities/bundle.entity';
import { Variant } from 'src/database/entities/variant.entity';
import { VariantValue } from 'src/database/entities/variant-value.entity';
import { Ingredient } from 'src/database/entities/ingredient.entity';
import { IngredientCategory } from 'src/database/entities/ingredient-category.entity';
import { CategoriesService } from './categories.service';
import { ItemsService } from './items.service';
import { BundlesService } from './bundles.service';
import { VariantsService } from './variants.service';
import { IngredientsService } from './ingredients.service';
import { CategoriesAdminController } from './categories-admin.controller';
import { ItemsAdminController } from './items-admin.controller';
import { BundlesAdminController } from './bundles-admin.controller';
import { VariantsAdminController } from './variants-admin.controller';
import { IngredientsAdminController } from './ingredients-admin.controller';
import { UploadMediaModule } from 'src/services/upload-media/upload-media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Item,
      Bundle,
      Variant,
      VariantValue,
      Ingredient,
      IngredientCategory,
    ]),
    ConfigModule,
    UploadMediaModule,
  ],
  controllers: [
    CategoriesAdminController,
    ItemsAdminController,
    BundlesAdminController,
    VariantsAdminController,
    IngredientsAdminController,
  ],
  providers: [
    CategoriesService,
    ItemsService,
    BundlesService,
    VariantsService,
    IngredientsService,
  ],
  exports: [
    CategoriesService,
    ItemsService,
    BundlesService,
    VariantsService,
    IngredientsService,
  ],
})
export class MenuModule {}
