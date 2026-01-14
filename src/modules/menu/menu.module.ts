import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "src/config/config.module";
import { Bundle } from "src/database/entities/bundle.entity";
import { BundleComponent } from "src/database/entities/bundle-component.entity";
import { BundleComponentItem } from "src/database/entities/bundle-component-item.entity";
import { Category } from "src/database/entities/category.entity";
import { Ingredient } from "src/database/entities/ingredient.entity";
import { IngredientCategory } from "src/database/entities/ingredient-category.entity";
import { Item } from "src/database/entities/item.entity";
import { UploadMediaModule } from "src/services/upload-media/upload-media.module";
import { BundlesService } from "./bundles.service";
import { BundlesAdminController } from "./bundles-admin.controller";
import { CategoriesService } from "./categories.service";
import { CategoriesAdminController } from "./categories-admin.controller";
import { IngredientsService } from "./ingredients.service";
import { IngredientsAdminController } from "./ingredients-admin.controller";
import { ItemsService } from "./items.service";
import { ItemsAdminController } from "./items-admin.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Item,
      Bundle,
      BundleComponent,
      BundleComponentItem,
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
    IngredientsAdminController,
  ],
  providers: [
    CategoriesService,
    ItemsService,
    BundlesService,
    IngredientsService,
  ],
  exports: [
    CategoriesService,
    ItemsService,
    BundlesService,
    IngredientsService,
  ],
})
export class MenuModule {}
