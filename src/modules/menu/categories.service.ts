import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from 'src/database/entities/category.entity';
import { IsNull, Repository } from 'typeorm';
import { CategoryOrderBy } from './dto/category/category-filter.dto';
import { CreateCategoryDto } from './dto/category/create-category.dto';
import { UpdateCategoryDto } from './dto/category/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    userId: string,
  ): Promise<Category> {
    const category = this.categoryRepository.create({
      ...createCategoryDto,
      createdBy: userId,
    });
    return await this.categoryRepository.save(category);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    isActive?: string,
    sortBy?: CategoryOrderBy,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ) {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.deletedAt IS NULL')
      .loadRelationCountAndMap('category.itemsCount', 'category.items');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        "(category.name ->> 'en' ILIKE :search OR category.name ->> 'ar' ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    // Status filter
    if (isActive === 'true' || isActive === 'false') {
      const isActiveBoolean = isActive === 'true';
      queryBuilder.andWhere('category.isActive = :isActive', {
        isActive: isActiveBoolean,
      });
    }

    // Handle ordering based on sortBy parameter
    if (sortBy) {
      switch (sortBy) {
        case CategoryOrderBy.SORT_ORDER:
          queryBuilder.orderBy('category.sortOrder', sortOrder);
          break;
        case CategoryOrderBy.UPDATED_AT:
          queryBuilder.orderBy('category.updatedAt', sortOrder);
          break;
        case CategoryOrderBy.ITEMS_COUNT:
          // For ordering by items count, we need to use a subquery approach
          queryBuilder
            .addSelect((qb) => {
              return qb
                .select('COUNT(items.id)')
                .from('items', 'items')
                .where('items.categoryId = category.id');
            }, 'items_count')
            .orderBy('items_count', sortOrder);
          break;
        default:
          queryBuilder.orderBy('category.sortOrder', sortOrder);
      }
    } else {
      queryBuilder.orderBy('category.sortOrder', sortOrder);
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

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['items'],
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ): Promise<Category> {
    const category = await this.findOne(id);

    Object.assign(category, updateCategoryDto, {
      updatedBy: userId,
    });

    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.categoryRepository.softDelete(id);
  }

  async findActiveCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }
}
