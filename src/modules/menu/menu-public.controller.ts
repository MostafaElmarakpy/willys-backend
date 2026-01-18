import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Version,
} from "@nestjs/common";
import { ItemStatus } from "../../common/enums/ItemStatus";
import { createSuccessResponse } from "../../common/utils/api-response-wrapper";
import { BundlesService } from "./bundles.service";
import { CategoriesService } from "./categories.service";
import { ItemsService } from "./items.service";

@Controller("menu")
export class MenuPublicController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly itemsService: ItemsService,
    private readonly bundlesService: BundlesService,
  ) {}

  @Get("categories")
  @Version("1")
  async getCategories() {
    const result = await this.categoriesService.findAll(
      1,
      100,
      undefined,
      "true",
    );
    return createSuccessResponse(
      result.categories,
      "Categories retrieved successfully",
    );
  }

  @Get("categories/:categoryId/items")
  @Version("1")
  async getItemsByCategory(
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
  ) {
    const result = await this.itemsService.findAll({
      categoriesIds: categoryId,
      status: ItemStatus.ACTIVE,
      page: 1,
      limit: 100,
    });

    return createSuccessResponse(result.items, "Items retrieved successfully");
  }

  @Get("items/:itemId")
  @Version("1")
  async getItem(@Param("itemId", ParseUUIDPipe) itemId: string) {
    const item = await this.itemsService.findOne(itemId);

    if (!item) {
      throw new NotFoundException("Item not found");
    }

    return createSuccessResponse(item, "Item retrieved successfully");
  }

  @Get("bundles/:bundleId")
  @Version("1")
  async getBundle(@Param("bundleId", ParseUUIDPipe) bundleId: string) {
    const bundle = await this.bundlesService.findOne(bundleId);

    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }

    return createSuccessResponse(bundle, "Bundle retrieved successfully");
  }
}
