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
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { CreateIngredientCategoryDto } from './dto/create-ingredient-category.dto';
import { UpdateIngredientCategoryDto } from './dto/update-ingredient-category.dto';
import { IngredientsService } from './ingredients.service';

interface IngredientQuery extends PaginationDto {
  search?: string;
  categoryId?: string;
}

interface CategoryQuery extends PaginationDto {
  search?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/menu/ingredients')
export class IngredientsAdminController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Get('categories')
  @Version('1')
  @Roles(UserRole.admin)
  async findAllCategories(@Query() query: CategoryQuery) {
    const { page = 1, limit = 10, search } = query;
    const categories = await this.ingredientsService.findAllCategories(
      page,
      limit,
      search,
    );
    return createSuccessResponse(
      categories,
      'Ingredient categories retrieved successfully',
    );
  }

  @Post('categories')
  @Version('1')
  @Roles(UserRole.admin)
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
  @Roles(UserRole.admin)
  async findActiveCategories() {
    const categories = await this.ingredientsService.findActiveCategories();
    return createSuccessResponse(
      categories,
      'Active ingredient categories retrieved successfully',
    );
  }

  @Get('categories/:id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOneCategory(@Param('id') id: string) {
    const category = await this.ingredientsService.findOneCategory(id);
    return createSuccessResponse(
      category,
      'Ingredient category retrieved successfully',
    );
  }

  @Patch('categories/:id')
  @Version('1')
  @Roles(UserRole.admin)
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
  @Roles(UserRole.admin)
  async removeCategory(@Param('id') id: string) {
    await this.ingredientsService.removeCategory(id);
    return createSuccessResponse(
      null,
      'Ingredient category deleted successfully',
    );
  }

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAllIngredients(@Query() query: IngredientQuery) {
    const { page = 1, limit = 10, search, categoryId } = query;
    const ingredients = await this.ingredientsService.findAllIngredients(
      page,
      limit,
      search,
      categoryId,
    );
    return createSuccessResponse(
      ingredients,
      'Ingredients retrieved successfully',
    );
  }

  @Post()
  @Version('1')
  @Roles(UserRole.admin)
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

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOneIngredient(@Param('id') id: string) {
    const ingredient = await this.ingredientsService.findOneIngredient(id);
    return createSuccessResponse(
      ingredient,
      'Ingredient retrieved successfully',
    );
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.admin)
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
  @Roles(UserRole.admin)
  async removeIngredient(@Param('id') id: string) {
    await this.ingredientsService.removeIngredient(id);
    return createSuccessResponse(null, 'Ingredient deleted successfully');
  }

  @Get('categories/:categoryId/ingredients')
  @Version('1')
  @Roles(UserRole.admin)
  async findIngredientsByCategory(@Param('categoryId') categoryId: string) {
    const ingredients =
      await this.ingredientsService.findIngredientsByCategory(categoryId);
    return createSuccessResponse(
      ingredients,
      'Category ingredients retrieved successfully',
    );
  }
}
