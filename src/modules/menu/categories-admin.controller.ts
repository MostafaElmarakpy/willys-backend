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
import { createSuccessResponse, createCreatedResponse } from 'src/common/utils/api-response-wrapper';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';

interface CategoryQuery extends PaginationDto {
  search?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/menu/categories')
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAll(@Query() query: CategoryQuery) {
    const { page = 1, limit = 10, search } = query;
    const categories = await this.categoriesService.findAll(page, limit, search);
    return createSuccessResponse(categories, 'Categories retrieved successfully');
  }

  @Post()
  @Version('1')
  @Roles(UserRole.admin)
  async create(@Body() createCategoryDto: CreateCategoryDto, @Request() req: any) {
    const category = await this.categoriesService.create(createCategoryDto, req.user.id);
    return createCreatedResponse(category, 'Category created successfully');
  }

  @Get('active')
  @Version('1')
  @Roles(UserRole.admin)
  async findActiveCategories() {
    const categories = await this.categoriesService.findActiveCategories();
    return createSuccessResponse(categories, 'Active categories retrieved successfully');
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOne(@Param('id') id: string) {
    const category = await this.categoriesService.findOne(id);
    return createSuccessResponse(category, 'Category retrieved successfully');
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req: any,
  ) {
    const category = await this.categoriesService.update(id, updateCategoryDto, req.user.id);
    return createSuccessResponse(category, 'Category updated successfully');
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(id);
    return createSuccessResponse(null, 'Category deleted successfully');
  }
}