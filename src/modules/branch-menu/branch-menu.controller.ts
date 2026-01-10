import {
  Controller,
  Get,
  Param,
  Query,
  Version,
  ParseBoolPipe,
  DefaultValuePipe,
  NotFoundException,
} from '@nestjs/common';
import { createSuccessResponse } from 'src/common/utils/api-response-wrapper';
import { BranchMenuService } from './branch-menu.service';

@Controller('branches/:branchId/menu')
export class BranchMenuController {
  constructor(private readonly branchMenuService: BranchMenuService) {}

  /**
   * Get complete available menu for a branch (customer-facing)
   */
  @Get()
  @Version('1')
  async getBranchMenu(
    @Param('branchId') branchId: string,
    @Query('includeCategories', new DefaultValuePipe(true), ParseBoolPipe)
    includeCategories: boolean,
    @Query('includeItems', new DefaultValuePipe(true), ParseBoolPipe)
    includeItems: boolean,
    @Query('includeBundles', new DefaultValuePipe(true), ParseBoolPipe)
    includeBundles: boolean,
  ) {
    const menu =
      await this.branchMenuService.getAvailableMenuForBranch(branchId);

    // Filter based on query params
    const filteredMenu: any = {};

    if (includeCategories) {
      filteredMenu.categories = menu.categories;
    }

    if (includeItems) {
      filteredMenu.items = menu.items;
    }

    if (includeBundles) {
      filteredMenu.bundles = menu.bundles;
    }

    return createSuccessResponse(
      filteredMenu,
      'Branch menu retrieved successfully',
    );
  }

  /**
   * Get all available categories for a branch
   */
  @Get('categories')
  @Version('1')
  async getAvailableCategories(@Param('branchId') branchId: string) {
    const categories =
      await this.branchMenuService.getAvailableCategoriesForBranch(branchId);

    return createSuccessResponse(
      categories,
      'Available categories retrieved successfully',
    );
  }

  /**
   * Get specific category if available at branch
   */
  @Get('categories/:categoryId')
  @Version('1')
  async getCategoryAtBranch(
    @Param('branchId') branchId: string,
    @Param('categoryId') categoryId: string,
  ) {
    const categories =
      await this.branchMenuService.getAvailableCategoriesForBranch(branchId);

    const category = categories.find((c) => c.id === categoryId);

    if (!category) {
      throw new NotFoundException(
        'Category not found or not available at this branch',
      );
    }

    return createSuccessResponse(category, 'Category retrieved successfully');
  }

  /**
   * Get all available items for a branch
   */
  @Get('items')
  @Version('1')
  async getAvailableItems(@Param('branchId') branchId: string) {
    const items =
      await this.branchMenuService.getAvailableItemsForBranch(branchId);

    return createSuccessResponse(
      items,
      'Available items retrieved successfully',
    );
  }

  /**
   * Get specific item if available at branch
   */
  @Get('items/:itemId')
  @Version('1')
  async getItemAtBranch(
    @Param('branchId') branchId: string,
    @Param('itemId') itemId: string,
  ) {
    const items =
      await this.branchMenuService.getAvailableItemsForBranch(branchId);

    const item = items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException(
        'Item not found or not available at this branch',
      );
    }

    return createSuccessResponse(item, 'Item retrieved successfully');
  }

  /**
   * Get all available bundles for a branch
   */
  @Get('bundles')
  @Version('1')
  async getAvailableBundles(@Param('branchId') branchId: string) {
    const bundles =
      await this.branchMenuService.getAvailableBundlesForBranch(branchId);

    return createSuccessResponse(
      bundles,
      'Available bundles retrieved successfully',
    );
  }

  /**
   * Get specific bundle if available at branch
   */
  @Get('bundles/:bundleId')
  @Version('1')
  async getBundleAtBranch(
    @Param('branchId') branchId: string,
    @Param('bundleId') bundleId: string,
  ) {
    const bundles =
      await this.branchMenuService.getAvailableBundlesForBranch(branchId);

    const bundle = bundles.find((b) => b.id === bundleId);

    if (!bundle) {
      throw new NotFoundException(
        'Bundle not found or not available at this branch',
      );
    }

    return createSuccessResponse(bundle, 'Bundle retrieved successfully');
  }
}
