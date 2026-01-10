import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
  Request,
} from '@nestjs/common';
import { Permission } from 'src/common/decorators/permissions.decorator';
import { PermissionModule } from 'src/common/enums/PermissionModule';
import { PermissionAction } from 'src/common/enums/PermissionAction';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import {
  createSuccessResponse,
  createCreatedResponse,
} from 'src/common/utils/api-response-wrapper';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountFilterDto } from './dto/discount-filter.dto';
import {
  AssignDiscountToUsersDto,
  AssignDiscountToItemsDto,
} from './dto/assign-discount.dto';
import { DiscountsService } from './discounts.service';
import {
  DiscountResponseDto,
  DiscountPaginationResponseDto,
} from './dto/discount-response.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/discounts')
export class DiscountsAdminController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.READ)
  async findAll(@Query() filterDto: DiscountFilterDto) {
    const result = await this.discountsService.findAll(filterDto);

    const response: DiscountPaginationResponseDto = {
      discounts: result.discounts.map((d) => new DiscountResponseDto(d)),
      metadata: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        activeCount: result.activeCount,
        inactiveCount: result.inactiveCount,
        percentageDiscountsCount: result.percentageDiscountsCount,
      },
    };

    return createSuccessResponse(response, 'Discounts retrieved successfully');
  }

  @Post()
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.CREATE)
  async create(
    @Body() createDiscountDto: CreateDiscountDto,
    @Request() req: any,
  ) {
    const discount = await this.discountsService.create(
      createDiscountDto,
      req.user.id,
    );
    return createCreatedResponse(discount, 'Discount created successfully');
  }

  @Get(':id')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.READ)
  async findOne(@Param('id') id: string) {
    const discount = await this.discountsService.findOne(id);
    const response = new DiscountResponseDto(discount);
    return createSuccessResponse(response, 'Discount retrieved successfully');
  }

  @Patch(':id')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.UPDATE)
  async update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
    @Request() req: any,
  ) {
    const discount = await this.discountsService.update(
      id,
      updateDiscountDto,
      req.user.id,
    );
    return createSuccessResponse(discount, 'Discount updated successfully');
  }

  @Delete(':id')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.DELETE)
  async remove(@Param('id') id: string) {
    await this.discountsService.remove(id);
    return createSuccessResponse(null, 'Discount deleted successfully');
  }

  @Post(':id/duplicate')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.DUPLICATE)
  async duplicate(@Param('id') id: string, @Request() req: any) {
    const discount = await this.discountsService.duplicate(id, req.user.id);
    return createCreatedResponse(discount, 'Discount duplicated successfully');
  }

  @Post(':id/assign-users')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.ASSIGN)
  async assignToUsers(
    @Param('id') id: string,
    @Body() assignDto: AssignDiscountToUsersDto,
    @Request() req: any,
  ) {
    await this.discountsService.assignToUsers(
      id,
      assignDto.userIds,
      req.user.id,
    );
    return createSuccessResponse(
      null,
      'Discount assigned to users successfully',
    );
  }

  @Post(':id/assign-items')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.ASSIGN)
  async assignToItems(
    @Param('id') id: string,
    @Body() assignDto: AssignDiscountToItemsDto,
    @Request() req: any,
  ) {
    await this.discountsService.assignToItems(
      id,
      assignDto.itemIds,
      req.user.id,
    );
    return createSuccessResponse(
      null,
      'Discount assigned to items successfully',
    );
  }

  @Delete(':id/users/:userId')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.ASSIGN)
  async removeUserAssignment(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    await this.discountsService.removeUserAssignment(id, userId);
    return createSuccessResponse(null, 'User assignment removed successfully');
  }

  @Delete(':id/items/:itemId')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.ASSIGN)
  async removeItemAssignment(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    await this.discountsService.removeItemAssignment(id, itemId);
    return createSuccessResponse(null, 'Item assignment removed successfully');
  }

  @Get(':id/users')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.READ)
  async getAssignedUsers(@Param('id') id: string) {
    const users = await this.discountsService.getAssignedUsers(id);
    return createSuccessResponse(
      users,
      'Assigned users retrieved successfully',
    );
  }

  @Get(':id/items')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.READ)
  async getAssignedItems(@Param('id') id: string) {
    const items = await this.discountsService.getAssignedItems(id);
    return createSuccessResponse(
      items,
      'Assigned items retrieved successfully',
    );
  }

  @Get(':id/usage-stats')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.READ)
  async getUsageStats(@Param('id') id: string) {
    const stats = await this.discountsService.getUsageStats(id);
    return createSuccessResponse(stats, 'Usage stats retrieved successfully');
  }

  @Patch(':id/activate')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.TOGGLE_STATUS)
  async activate(@Param('id') id: string, @Request() req: any) {
    const discount = await this.discountsService.activateDiscount(
      id,
      req.user.id,
    );
    return createSuccessResponse(discount, 'Discount activated successfully');
  }

  @Patch(':id/deactivate')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.TOGGLE_STATUS)
  async deactivate(@Param('id') id: string, @Request() req: any) {
    const discount = await this.discountsService.deactivateDiscount(
      id,
      req.user.id,
    );
    return createSuccessResponse(discount, 'Discount deactivated successfully');
  }

  @Patch(':id/expire')
  @Version('1')
  @Permission(PermissionModule.DISCOUNTS, PermissionAction.TOGGLE_STATUS)
  async expire(@Param('id') id: string, @Request() req: any) {
    const discount = await this.discountsService.expireDiscount(
      id,
      req.user.id,
    );
    return createSuccessResponse(discount, 'Discount expired successfully');
  }
}
