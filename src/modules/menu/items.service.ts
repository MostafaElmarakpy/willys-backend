import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Item } from 'src/database/entities/item.entity';
import { Variant } from 'src/database/entities/variant.entity';
import { Ingredient } from 'src/database/entities/ingredient.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemFilterDto } from './dto/item-filter.dto';
import { ItemStatus } from 'src/common/enums/ItemStatus';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
  ) {}

  async create(createItemDto: CreateItemDto, userId: string): Promise<Item> {
    const { variantIds, ingredientIds, ...itemData } = createItemDto;
    
    const item = this.itemRepository.create({
      ...itemData,
      createdBy: userId,
    });

    if (variantIds && variantIds.length > 0) {
      item.variants = await this.variantRepository.findByIds(variantIds);
    }

    if (ingredientIds && ingredientIds.length > 0) {
      item.ingredients = await this.ingredientRepository.findByIds(ingredientIds);
    }

    return await this.itemRepository.save(item);
  }

  async findAll(filterDto: ItemFilterDto) {
    const { page = 1, limit = 10, search, status, categoryId, minPrice, maxPrice, sortBy = 'createdAt', sortOrder = 'DESC', variantIds } = filterDto;

    const queryBuilder = this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.variants', 'variants')
      .leftJoinAndSelect('item.ingredients', 'ingredients')
      .leftJoinAndSelect('item.createdByUser', 'createdBy')
      .leftJoinAndSelect('item.updatedByUser', 'updatedBy');

    if (search) {
      queryBuilder.where(
        '(item.name ->> \'en\' ILIKE :search OR item.name ->> \'ar\' ILIKE :search OR item.description ->> \'en\' ILIKE :search OR item.description ->> \'ar\' ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (status) {
      queryBuilder.andWhere('item.status = :status', { status });
    }

    if (categoryId) {
      queryBuilder.andWhere('item.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      if (minPrice !== undefined && maxPrice !== undefined) {
        queryBuilder.andWhere('item.price BETWEEN :minPrice AND :maxPrice', { minPrice, maxPrice });
      } else if (minPrice !== undefined) {
        queryBuilder.andWhere('item.price >= :minPrice', { minPrice });
      } else if (maxPrice !== undefined) {
        queryBuilder.andWhere('item.price <= :maxPrice', { maxPrice });
      }
    }

    if (variantIds && variantIds.length > 0) {
      queryBuilder.andWhere('variants.id IN (:...variantIds)', { variantIds });
    }

    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt', 'sortOrder'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    
    if (sortField === 'name') {
      queryBuilder.orderBy(`item.name ->> 'en'`, sortOrder as 'ASC' | 'DESC');
    } else {
      queryBuilder.orderBy(`item.${sortField}`, sortOrder as 'ASC' | 'DESC');
    }

    const [items, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['category', 'variants', 'variants.values', 'ingredients', 'createdByUser', 'updatedByUser'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(id: string, updateItemDto: UpdateItemDto, userId: string): Promise<Item> {
    const { variantIds, ingredientIds, ...itemData } = updateItemDto;
    const item = await this.findOne(id);
    
    Object.assign(item, itemData, {
      updatedBy: userId,
    });

    if (variantIds !== undefined) {
      if (variantIds.length > 0) {
        item.variants = await this.variantRepository.findByIds(variantIds);
      } else {
        item.variants = [];
      }
    }

    if (ingredientIds !== undefined) {
      if (ingredientIds.length > 0) {
        item.ingredients = await this.ingredientRepository.findByIds(ingredientIds);
      } else {
        item.ingredients = [];
      }
    }

    return await this.itemRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.itemRepository.remove(item);
  }

  async findByCategory(categoryId: string): Promise<Item[]> {
    return await this.itemRepository.find({
      where: { categoryId, status: ItemStatus.ACTIVE },
      relations: ['variants', 'variants.values', 'ingredients'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async duplicate(id: string, userId: string): Promise<Item> {
    const originalItem = await this.findOne(id);
    
    const duplicatedItem = this.itemRepository.create({
      name: {
        en: `${originalItem.name.en} (Copy)`,
        ar: `${originalItem.name.ar} (نسخة)`
      },
      description: originalItem.description,
      image: originalItem.image,
      price: originalItem.price,
      status: ItemStatus.DRAFT,
      sortOrder: 0,
      categoryId: originalItem.categoryId,
      createdBy: userId,
      variants: originalItem.variants,
      ingredients: originalItem.ingredients,
    });

    return await this.itemRepository.save(duplicatedItem);
  }

  async archiveItem(id: string, userId: string): Promise<Item> {
    const item = await this.findOne(id);
    
    item.status = ItemStatus.ARCHIVED;
    item.updatedBy = userId;
    
    return await this.itemRepository.save(item);
  }
}