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
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/UserRole';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import {
  createSuccessResponse,
  createCreatedResponse,
} from 'src/common/utils/api-response-wrapper';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemFilterDto } from './dto/item-filter.dto';
import { ItemsService } from './items.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/menu/items')
export class ItemsAdminController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAll(@Query() filterDto: ItemFilterDto) {
    const items = await this.itemsService.findAll(filterDto);
    return createSuccessResponse(items, 'Items retrieved successfully');
  }

  @Post()
  @Version('1')
  @Roles(UserRole.admin)
  async create(@Body() createItemDto: CreateItemDto, @Request() req: any) {
    const item = await this.itemsService.create(createItemDto, req.user.id);
    return createCreatedResponse(item, 'Item created successfully');
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOne(@Param('id') id: string) {
    const item = await this.itemsService.findOne(id);
    return createSuccessResponse(item, 'Item retrieved successfully');
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async update(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
    @Request() req: any,
  ) {
    const item = await this.itemsService.update(id, updateItemDto, req.user.id);
    return createSuccessResponse(item, 'Item updated successfully');
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async remove(@Param('id') id: string) {
    await this.itemsService.remove(id);
    return createSuccessResponse(null, 'Item deleted successfully');
  }

  @Get('category/:categoryId')
  @Version('1')
  @Roles(UserRole.admin)
  async findByCategory(@Param('categoryId') categoryId: string) {
    const items = await this.itemsService.findByCategory(categoryId);
    return createSuccessResponse(
      items,
      'Category items retrieved successfully',
    );
  }

  @Post(':id/duplicate')
  @Version('1')
  @Roles(UserRole.admin)
  async duplicate(@Param('id') id: string, @Request() req: any) {
    const item = await this.itemsService.duplicate(id, req.user.id);
    return createCreatedResponse(item, 'Item duplicated successfully');
  }

  @Patch(':id/archive')
  @Version('1')
  @Roles(UserRole.admin)
  async archive(@Param('id') id: string, @Request() req: any) {
    const item = await this.itemsService.archiveItem(id, req.user.id);
    return createSuccessResponse(item, 'Item archived successfully');
  }
}
