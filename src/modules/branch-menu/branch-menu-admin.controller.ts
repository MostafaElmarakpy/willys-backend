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
} from "@nestjs/common";
import { Permission } from "src/common/decorators/permissions.decorator";
import { PermissionAction } from "src/common/enums/PermissionAction";
import { PermissionModule } from "src/common/enums/PermissionModule";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import { createSuccessResponse } from "src/common/utils/api-response-wrapper";
import { BranchMenuService } from "./branch-menu.service";
import { BulkUpdateAvailabilityDto } from "./dto/bulk-update-availability.dto";
import { SetAvailabilityDto } from "./dto/set-availability.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/branches/:branchId/menu")
export class BranchMenuAdminController {
  constructor(private readonly branchMenuService: BranchMenuService) {}

  /**
   * Get all overrides for a branch (categories, items, bundles)
   */
  @Get("overrides")
  @Version("1")
  @Permission(PermissionModule.BRANCH_MENU, PermissionAction.READ)
  async getBranchOverrides(@Param("branchId") branchId: string) {
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
      "Branch menu overrides retrieved successfully",
    );
  }

  /**
   * Set category availability for a branch
   */
  @Put("categories/:categoryId/availability")
  @Version("1")
  @Permission(PermissionModule.BRANCH_MENU, PermissionAction.UPDATE)
  async setCategoryAvailability(
    @Param("branchId") branchId: string,
    @Param("categoryId") categoryId: string,
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
      "Category availability updated successfully",
    );
  }

  /**
   * Set item availability for a branch
   */
  @Put("items/:itemId/availability")
  @Version("1")
  @Permission(PermissionModule.BRANCH_MENU, PermissionAction.UPDATE)
  async setItemAvailability(
    @Param("branchId") branchId: string,
    @Param("itemId") itemId: string,
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
      "Item availability updated successfully",
    );
  }

  /**
   * Set bundle availability for a branch
   */
  @Put("bundles/:bundleId/availability")
  @Version("1")
  @Permission(PermissionModule.BRANCH_MENU, PermissionAction.UPDATE)
  async setBundleAvailability(
    @Param("branchId") branchId: string,
    @Param("bundleId") bundleId: string,
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
      "Bundle availability updated successfully",
    );
  }

  /**
   * Bulk update availability for categories, items, and bundles
   */
  @Patch("bulk-update")
  @Version("1")
  @Permission(PermissionModule.BRANCH_MENU, PermissionAction.BULK_UPDATE)
  async bulkUpdateAvailability(
    @Param("branchId") branchId: string,
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
      "Bulk availability update completed successfully",
    );
  }

  /**
   * Remove category override (revert to core menu)
   */
  @Delete("categories/:categoryId/availability")
  @Version("1")
  @Permission(PermissionModule.BRANCH_MENU, PermissionAction.DELETE)
  async removeCategoryOverride(
    @Param("branchId") branchId: string,
    @Param("categoryId") categoryId: string,
  ) {
    await this.branchMenuService.removeCategoryOverride(branchId, categoryId);

    return createSuccessResponse(
      null,
      "Category override removed successfully",
    );
  }

  /**
   * Remove item override (revert to core menu)
   */
  @Delete("items/:itemId/availability")
  @Version("1")
  @Permission(PermissionModule.BRANCH_MENU, PermissionAction.DELETE)
  async removeItemOverride(
    @Param("branchId") branchId: string,
    @Param("itemId") itemId: string,
  ) {
    await this.branchMenuService.removeItemOverride(branchId, itemId);

    return createSuccessResponse(null, "Item override removed successfully");
  }

  /**
   * Remove bundle override (revert to core menu)
   */
  @Delete("bundles/:bundleId/availability")
  @Version("1")
  @Permission(PermissionModule.BRANCH_MENU, PermissionAction.DELETE)
  async removeBundleOverride(
    @Param("branchId") branchId: string,
    @Param("bundleId") bundleId: string,
  ) {
    await this.branchMenuService.removeBundleOverride(branchId, bundleId);

    return createSuccessResponse(null, "Bundle override removed successfully");
  }
}
