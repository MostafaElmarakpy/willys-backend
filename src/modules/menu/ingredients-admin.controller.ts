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
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateIngredientDto } from './dto/ingredient/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/ingredient/update-ingredient.dto';
import { CreateIngredientCategoryDto } from './dto/ingredient/create-ingredient-category.dto';
import { UpdateIngredientCategoryDto } from './dto/ingredient/update-ingredient-category.dto';
import { IngredientsService } from './ingredients.service';

interface IngredientQuery extends PaginationDto {
  search?: string;
  categoryId?: string;
}

interface CategoryQuery extends PaginationDto {
  search?: string;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/menu/ingredients')
export class IngredientsAdminController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get('categories')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.READ)
  async findAllCategories(@Query() query: CategoryQuery) {
    const { page = 1, limit = 10, search, sortBy, sortOrder = 'DESC' } = query;
    const categories = await this.ingredientsService.findAllCategories(
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    );
    return createSuccessResponse(
      categories,
      'Ingredient categories retrieved successfully',
    );
  }

  @Post('categories')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.CREATE)
  async createCategory(
    @Body() createIngredientCategoryDto: CreateIngredientCategoryDto,
    @Request() req: any,
  ) {
    const category = await this.ingredientsService.createCategory(
      createIngredientCategoryDto,
      req.user.id,
    );
    return createCreatedResponse(
      category,
      'Ingredient category created successfully',
    );
  }

  @Get('categories/active')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.READ)
  async findActiveCategories() {
    const categories = await this.ingredientsService.findActiveCategories();
    return createSuccessResponse(
      categories,
      'Active ingredient categories retrieved successfully',
    );
  }

  @Get('categories/:id')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.READ)
  async findOneCategory(@Param('id') id: string) {
    const category = await this.ingredientsService.findOneCategory(id);
    return createSuccessResponse(
      category,
      'Ingredient category retrieved successfully',
    );
  }

  @Patch('categories/:id')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.UPDATE)
  async updateCategory(
    @Param('id') id: string,
    @Body() updateIngredientCategoryDto: UpdateIngredientCategoryDto,
    @Request() req: any,
  ) {
    const category = await this.ingredientsService.updateCategory(
      id,
      updateIngredientCategoryDto,
      req.user.id,
    );
    return createSuccessResponse(
      category,
      'Ingredient category updated successfully',
    );
  }

  @Delete('categories/:id')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.DELETE)
  async removeCategory(@Param('id') id: string) {
    await this.ingredientsService.removeCategory(id);
    return createSuccessResponse(
      null,
      'Ingredient category deleted successfully',
    );
  }

  @Get()
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.READ)
  async findAllIngredients(@Query() query: IngredientQuery) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      sortBy,
      sortOrder = 'DESC',
    } = query;
    const ingredients = await this.ingredientsService.findAllIngredients(
      page,
      limit,
      search,
      categoryId,
      sortBy,
      sortOrder,
    );
    return createSuccessResponse(
      ingredients,
      'Ingredients retrieved successfully',
    );
  }

  @Post()
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.CREATE)
  async createIngredient(
    @Body() createIngredientDto: CreateIngredientDto,
    @Request() req: any,
  ) {
    const ingredient = await this.ingredientsService.createIngredient(
      createIngredientDto,
      req.user.id,
    );
    return createCreatedResponse(ingredient, 'Ingredient created successfully');
  }

  @Get('default-extras')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.READ)
  async findDefaultExtras() {
    const extras = await this.ingredientsService.findDefaultExtras();
    return createSuccessResponse(
      extras,
      'Default extras retrieved successfully',
    );
  }

  @Get(':id')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.READ)
  async findOneIngredient(@Param('id') id: string) {
    const ingredient = await this.ingredientsService.findOneIngredient(id);
    return createSuccessResponse(
      ingredient,
      'Ingredient retrieved successfully',
    );
  }

  @Patch(':id')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.UPDATE)
  async updateIngredient(
    @Param('id') id: string,
    @Body() updateIngredientDto: UpdateIngredientDto,
    @Request() req: any,
  ) {
    const ingredient = await this.ingredientsService.updateIngredient(
      id,
      updateIngredientDto,
      req.user.id,
    );
    return createSuccessResponse(ingredient, 'Ingredient updated successfully');
  }

  @Delete(':id')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.DELETE)
  async removeIngredient(@Param('id') id: string) {
    await this.ingredientsService.removeIngredient(id);
    return createSuccessResponse(null, 'Ingredient deleted successfully');
  }

  @Get('categories/:categoryId/ingredients')
  @Version('1')
  @Permission(PermissionModule.INGREDIENTS, PermissionAction.READ)
  async findIngredientsByCategory(@Param('categoryId') categoryId: string) {
    const ingredients =
      await this.ingredientsService.findIngredientsByCategory(categoryId);
    return createSuccessResponse(
      ingredients,
      'Category ingredients retrieved successfully',
    );
  }
}
