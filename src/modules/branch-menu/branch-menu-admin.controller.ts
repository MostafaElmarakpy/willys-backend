import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Request,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/UserRole';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import {
  createSuccessResponse,
  createCreatedResponse,
} from 'src/common/utils/api-response-wrapper';
import { BranchMenuService } from './branch-menu.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { BulkUpdateAvailabilityDto } from './dto/bulk-update-availability.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/branches/:branchId/menu')
export class BranchMenuAdminController {
  constructor(private readonly branchMenuService: BranchMenuService) {}

  /**
   * Get all overrides for a branch (categories, items, bundles)
   */
  @Get('overrides')
  @Version('1')
  @Roles(UserRole.admin)
  async getBranchOverrides(@Param('branchId') branchId: string) {
    const [categories, items, bundles] = await Promise.all([
      this.branchMenuService.getBranchCategoryOverrides(branchId),
      this.branchMenuService.getBranchItemOverrides(branchId),
      this.branchMenuService.getBranchBundleOverrides(branchId),
    ]);

    return createSuccessResponse(
      {
        categories,
        items,
        bundles,
      },
      'Branch menu overrides retrieved successfully',
    );
  }

  /**
   * Set category availability for a branch
   */
  @Put('categories/:categoryId/availability')
  @Version('1')
  @Roles(UserRole.admin)
  async setCategoryAvailability(
    @Param('branchId') branchId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: SetAvailabilityDto,
    @Request() req: any,
  ) {
    const override = await this.branchMenuService.setBranchCategoryAvailability(
      branchId,
      categoryId,
      dto.isAvailable,
      req.user.id,
      dto.reason,
    );

    return createSuccessResponse(
      override,
      'Category availability updated successfully',
    );
  }

  /**
   * Set item availability for a branch
   */
  @Put('items/:itemId/availability')
  @Version('1')
  @Roles(UserRole.admin)
  async setItemAvailability(
    @Param('branchId') branchId: string,
    @Param('itemId') itemId: string,
    @Body() dto: SetAvailabilityDto,
    @Request() req: any,
  ) {
    const override = await this.branchMenuService.setBranchItemAvailability(
      branchId,
      itemId,
      dto.isAvailable,
      req.user.id,
      dto.reason,
    );

    return createSuccessResponse(
      override,
      'Item availability updated successfully',
    );
  }

  /**
   * Set bundle availability for a branch
   */
  @Put('bundles/:bundleId/availability')
  @Version('1')
  @Roles(UserRole.admin)
  async setBundleAvailability(
    @Param('branchId') branchId: string,
    @Param('bundleId') bundleId: string,
    @Body() dto: SetAvailabilityDto,
    @Request() req: any,
  ) {
    const override = await this.branchMenuService.setBranchBundleAvailability(
      branchId,
      bundleId,
      dto.isAvailable,
      req.user.id,
      dto.reason,
    );

    return createSuccessResponse(
      override,
      'Bundle availability updated successfully',
    );
  }

  /**
   * Bulk update availability for categories, items, and bundles
   */
  @Patch('bulk-update')
  @Version('1')
  @Roles(UserRole.admin)
  async bulkUpdateAvailability(
    @Param('branchId') branchId: string,
    @Body() dto: BulkUpdateAvailabilityDto,
    @Request() req: any,
  ) {
    const result = await this.branchMenuService.bulkUpdateAvailability(
      branchId,
      dto,
      req.user.id,
    );

    return createSuccessResponse(
      result,
      'Bulk availability update completed successfully',
    );
  }

  /**
   * Remove category override (revert to core menu)
   */
  @Delete('categories/:categoryId/availability')
  @Version('1')
  @Roles(UserRole.admin)
  async removeCategoryOverride(
    @Param('branchId') branchId: string,
    @Param('categoryId') categoryId: string,
  ) {
    await this.branchMenuService.removeCategoryOverride(branchId, categoryId);

    return createSuccessResponse(
      null,
      'Category override removed successfully',
    );
  }

  /**
   * Remove item override (revert to core menu)
   */
  @Delete('items/:itemId/availability')
  @Version('1')
  @Roles(UserRole.admin)
  async removeItemOverride(
    @Param('branchId') branchId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.branchMenuService.removeItemOverride(branchId, itemId);

    return createSuccessResponse(null, 'Item override removed successfully');
  }

  /**
   * Remove bundle override (revert to core menu)
   */
  @Delete('bundles/:bundleId/availability')
  @Version('1')
  @Roles(UserRole.admin)
  async removeBundleOverride(
    @Param('branchId') branchId: string,
    @Param('bundleId') bundleId: string,
  ) {
    await this.branchMenuService.removeBundleOverride(branchId, bundleId);

    return createSuccessResponse(null, 'Bundle override removed successfully');
  }
}
