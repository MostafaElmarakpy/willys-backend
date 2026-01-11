import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Ingredient } from 'src/database/entities/ingredient.entity';
import { IngredientCategory } from 'src/database/entities/ingredient-category.entity';
import { CreateIngredientDto } from './dto/ingredient/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/ingredient/update-ingredient.dto';
import { CreateIngredientCategoryDto } from './dto/ingredient/create-ingredient-category.dto';
import { UpdateIngredientCategoryDto } from './dto/ingredient/update-ingredient-category.dto';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    @InjectRepository(IngredientCategory)
    private readonly ingredientCategoryRepository: Repository<IngredientCategory>,
  ) {}

  async createCategory(
    createIngredientCategoryDto: CreateIngredientCategoryDto,
    userId: string,
  ): Promise<IngredientCategory> {
    const category = this.ingredientCategoryRepository.create({
      ...createIngredientCategoryDto,
      createdBy: userId,
    });
    return await this.ingredientCategoryRepository.save(category);
  }

  async findAllCategories(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const allowedSortFields = ['name', 'sortOrder', 'createdAt', 'updatedAt'];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'sortOrder';

    const queryBuilder = this.ingredientCategoryRepository
      .createQueryBuilder('category')
      .where('category.deletedAt IS NULL')
      .leftJoinAndSelect('category.ingredients', 'ingredients');

    if (search) {
      queryBuilder.where(
        "(category.name ->> 'en' ILIKE :search OR category.name ->> 'ar' ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    // Handle dynamic ordering
    if (orderField === 'name') {
      queryBuilder.orderBy("category.name ->> 'en'", sortOrder);
    } else {
      queryBuilder.orderBy(`category.${orderField}`, sortOrder);
    }

    const [categories, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      categories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneCategory(id: string): Promise<IngredientCategory> {
    const category = await this.ingredientCategoryRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['ingredients'],
    });

    if (!category) {
      throw new NotFoundException(
        `Ingredient category with ID ${id} not found`,
      );
    }

    return category;
  }

  async updateCategory(
    id: string,
    updateIngredientCategoryDto: UpdateIngredientCategoryDto,
    userId: string,
  ): Promise<IngredientCategory> {
    const category = await this.findOneCategory(id);

    Object.assign(category, updateIngredientCategoryDto, {
      updatedBy: userId,
    });

    return await this.ingredientCategoryRepository.save(category);
  }

  async removeCategory(id: string): Promise<void> {
    await this.findOneCategory(id);
    await this.ingredientCategoryRepository.softDelete(id);
  }

  async createIngredient(
    createIngredientDto: CreateIngredientDto,
    userId: string,
  ): Promise<Ingredient> {
    const _category = await this.findOneCategory(
      createIngredientDto.categoryId,
    );

    const ingredient = this.ingredientRepository.create({
      ...createIngredientDto,
      createdBy: userId,
    });

    return await this.ingredientRepository.save(ingredient);
  }

  async findAllIngredients(
    page: number = 1,
    limit: number = 10,
    search?: string,
    categoryId?: string,
    sortBy?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const allowedSortFields = ['name', 'price', 'createdAt', 'updatedAt'];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const queryBuilder = this.ingredientRepository
      .createQueryBuilder('ingredient')
      .leftJoinAndSelect('ingredient.category', 'category');

    if (search) {
      queryBuilder.where(
        "(ingredient.name ->> 'en' ILIKE :search OR ingredient.name ->> 'ar' ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (categoryId) {
      queryBuilder.andWhere('ingredient.categoryId = :categoryId', {
        categoryId,
      });
    }

    // Handle dynamic ordering
    if (orderField === 'name') {
      queryBuilder.orderBy("ingredient.name ->> 'en'", sortOrder);
    } else {
      queryBuilder.orderBy(`ingredient.${orderField}`, sortOrder);
    }

    const [ingredients, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      ingredients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneIngredient(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['category'],
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }

    return ingredient;
  }

  async updateIngredient(
    id: string,
    updateIngredientDto: UpdateIngredientDto,
    userId: string,
  ): Promise<Ingredient> {
    const ingredient = await this.findOneIngredient(id);

    Object.assign(ingredient, updateIngredientDto, {
      updatedBy: userId,
    });

    return await this.ingredientRepository.save(ingredient);
  }

  async removeIngredient(id: string): Promise<void> {
    await this.findOneIngredient(id);
    await this.ingredientRepository.softDelete(id);
  }

  async findActiveCategories(): Promise<IngredientCategory[]> {
    return await this.ingredientCategoryRepository.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findIngredientsByCategory(categoryId: string): Promise<Ingredient[]> {
    return await this.ingredientRepository.find({
      where: { categoryId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findDefaultExtras(): Promise<Ingredient[]> {
    return await this.ingredientRepository.find({
      where: { isDefaultExtra: true, isActive: true, deletedAt: IsNull() },
      relations: ['category'],
      order: { name: { en: 'ASC' } },
    });
  }
}
