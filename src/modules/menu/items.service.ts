import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Item } from 'src/database/entities/item.entity';
import { Variant } from 'src/database/entities/variant.entity';
import { Ingredient } from 'src/database/entities/ingredient.entity';
import { CreateItemDto } from './dto/item/create-item.dto';
import { UpdateItemDto } from './dto/item/update-item.dto';
import { ItemFilterDto } from './dto/item/item-filter.dto';
import { ItemStatus } from 'src/common/enums/ItemStatus';
import { UploadMediaService } from 'src/services/upload-media/upload-media.service';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(Ingredient)
    private readonly ingredientRepository: Repository<Ingredient>,
    private readonly uploadMediaService: UploadMediaService,
  ) {}

  async create(
    createItemDto: CreateItemDto,
    userId: string,
    files: { [fieldName: string]: Express.Multer.File[] },
  ): Promise<Item> {
    const { variantIds, ingredientIds, ingredients, extras, tags, pricing, ...itemData } = createItemDto;

    // Convert pricing to the correct format for the entity
    let pricingValue: number | {
      price?: string;
      variants: Array<{
        name: string;
        sortOrder?: number;
        values: Array<{
          value: string;
          price: string;
          sortOrder?: number;
        }>;
      }>;
      type: 'number' | 'object';
    };

    if (typeof pricing === 'number') {
      // Direct number value
      pricingValue = pricing;
    } else if (typeof pricing === 'string') {
      // String number value
      const price = parseFloat(pricing);
      if (isNaN(price)) {
        throw new Error('Invalid price string');
      }
      pricingValue = price;
    } else if (typeof pricing === 'object' && pricing.type === 'number' && pricing.price) {
      // Object with type: 'number' and price field
      pricingValue = parseFloat(pricing.price);
      if (isNaN(pricingValue)) {
        throw new Error('Invalid price in pricing object');
      }
    } else {
      // Object with variants (type: 'object')
      pricingValue = pricing as any;
    }

    const item = this.itemRepository.create({
      ...itemData,
      createdBy: userId,
      pricing: pricingValue,
      tags: tags || [],
      extras: extras || [],
      ingredientsWithQuantity: ingredients || [],
    });

    if (files['image']) {
      item.image = (
        await this.uploadMediaService.saveOneFile(
          files?.image,
          'properties',
          item.id,
        )
      )?.url;
    }

    if (variantIds && variantIds.length > 0) {
      item.variants = await this.variantRepository.findBy({
        id: variantIds as any,
      });
    }

    if (ingredientIds && ingredientIds.length > 0) {
      item.ingredients = await this.ingredientRepository.findBy({
        id: ingredientIds as any,
      });
    }

    return await this.itemRepository.save(item);
  }

  async findAll(filterDto: ItemFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      categoriesIds,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      variantIds,
      fromDate,
      toDate,
    } = filterDto;

    const validSortFields = [
      'name',
      'pricing',
      'createdAt',
      'updatedAt',
      'sortOrder',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    let whereConditions: string[] = [];
    let parameters: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(
        `(i.name ->> 'en' ILIKE $${paramIndex} OR i.name ->> 'ar' ILIKE $${paramIndex} OR i.description ->> 'en' ILIKE $${paramIndex} OR i.description ->> 'ar' ILIKE $${paramIndex})`,
      );
      parameters.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`i.status = $${paramIndex}`);
      parameters.push(status);
      paramIndex++;
    }

    if (categoriesIds) {
      const categoryIdsArray = Array.isArray(categoriesIds)
        ? categoriesIds
        : [categoriesIds];
      if (categoryIdsArray.length > 0) {
        whereConditions.push(`i."categoryId" = ANY($${paramIndex})`);
        parameters.push(categoryIdsArray);
        paramIndex++;
      }
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      whereConditions.push(
        `(CASE WHEN jsonb_typeof(i.pricing) = 'number' THEN (i.pricing::text)::numeric ELSE 0 END) BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
      );
      parameters.push(minPrice, maxPrice);
      paramIndex += 2;
    } else if (minPrice !== undefined) {
      whereConditions.push(`(CASE WHEN jsonb_typeof(i.pricing) = 'number' THEN (i.pricing::text)::numeric ELSE 0 END) >= $${paramIndex}`);
      parameters.push(minPrice);
      paramIndex++;
    } else if (maxPrice !== undefined) {
      whereConditions.push(`(CASE WHEN jsonb_typeof(i.pricing) = 'number' THEN (i.pricing::text)::numeric ELSE 0 END) <= $${paramIndex}`);
      parameters.push(maxPrice);
      paramIndex++;
    }

    if (variantIds && variantIds.length > 0) {
      whereConditions.push(`v.id = ANY($${paramIndex})`);
      parameters.push(variantIds);
      paramIndex++;
    }

    if (fromDate && toDate) {
      whereConditions.push(
        `i."updatedAt" BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
      );
      parameters.push(fromDate, toDate);
      paramIndex += 2;
    } else if (fromDate) {
      whereConditions.push(`i."updatedAt" >= $${paramIndex}`);
      parameters.push(fromDate);
      paramIndex++;
    } else if (toDate) {
      whereConditions.push(`i."updatedAt" <= $${paramIndex}`);
      parameters.push(toDate);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    let orderByClause = '';
    if (sortField === 'name') {
      orderByClause = `ORDER BY i.name ->> 'en' ${sortOrder}`;
    } else if (sortField === 'pricing') {
      orderByClause = `ORDER BY (CASE WHEN jsonb_typeof(i.pricing) = 'number' THEN (i.pricing::text)::numeric ELSE 0 END) ${sortOrder}`;
    } else {
      orderByClause = `ORDER BY i."${sortField}" ${sortOrder}`;
    }

    const itemsQuery = `
      SELECT
        i.id,
        i.name,
        i.description,
        i.image,
        i.pricing,
        i.tags,
        i.extras,
        i."ingredientsWithQuantity",
        i.status,
        i."sortOrder",
        i."categoryId",
        i."createdBy",
        i."updatedBy",
        i."createdAt",
        i."updatedAt",
        c.name as "categoryName",
        COALESCE(variant_count.count, 0) as "variantCount"
      FROM items i
      LEFT JOIN categories c ON c.id = i."categoryId"
      LEFT JOIN (
        SELECT
          iv."itemId",
          COUNT(DISTINCT v.id) as count
        FROM item_variants iv
        LEFT JOIN variants v ON v.id = iv."variantId"
        GROUP BY iv."itemId"
      ) variant_count ON variant_count."itemId" = i.id
      ${
        variantIds && variantIds.length > 0
          ? `
      INNER JOIN item_variants iv ON iv."itemId" = i.id
      INNER JOIN variants v ON v.id = iv."variantId"
      `
          : ''
      }
      ${whereClause}
      ${variantIds && variantIds.length > 0 ? 'GROUP BY i.id, c.name, variant_count.count' : ''}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM items i
      LEFT JOIN categories c ON c.id = i."categoryId"
      ${
        variantIds && variantIds.length > 0
          ? `
      INNER JOIN item_variants iv ON iv."itemId" = i.id
      INNER JOIN variants v ON v.id = iv."variantId"
      `
          : ''
      }
      ${whereClause}
    `;

    // Add pagination parameters
    const itemsParameters = [...parameters, limit, (page - 1) * limit];
    const countParameters = [...parameters];

    const [items, countResult] = await Promise.all([
      this.itemRepository.query(itemsQuery, itemsParameters),
      this.itemRepository.query(countQuery, countParameters),
    ]);

    const total = parseInt(countResult[0].total);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['category', 'variants', 'variants.values', 'ingredients'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async update(
    id: string,
    updateItemDto: UpdateItemDto,
    userId: string,
    files: { [fieldName: string]: Express.Multer.File[] },
  ): Promise<Item> {
    const { variantIds, ingredientIds, ingredients, extras, tags, pricing, ...itemData } = updateItemDto;
    const item = await this.findOne(id);

    Object.assign(item, itemData, {
      updatedBy: userId,
    });

    if (pricing !== undefined) {
      // Convert pricing to the correct format for the entity
      if (typeof pricing === 'number') {
        // Direct number value
        item.pricing = pricing;
      } else if (typeof pricing === 'string') {
        // String number value
        const price = parseFloat(pricing);
        if (isNaN(price)) {
          throw new Error('Invalid price string');
        }
        item.pricing = price;
      } else if (typeof pricing === 'object' && pricing.type === 'number' && pricing.price) {
        // Object with type: 'number' and price field
        const price = parseFloat(pricing.price);
        if (isNaN(price)) {
          throw new Error('Invalid price in pricing object');
        }
        item.pricing = price;
      } else {
        // Object with variants (type: 'object')
        item.pricing = pricing as any;
      }
    }

    if (tags !== undefined) {
      item.tags = tags;
    }

    if (extras !== undefined) {
      item.extras = extras;
    }

    if (ingredients !== undefined) {
      item.ingredientsWithQuantity = ingredients;
    }

    if (variantIds !== undefined) {
      if (variantIds.length > 0) {
        item.variants = await this.variantRepository.findBy({
          id: variantIds as any,
        });
      } else {
        item.variants = [];
      }
    }

    if (files['image']) {
      item.image = (
        await this.uploadMediaService.saveOneFile(
          files?.image,
          'properties',
          item.id,
        )
      )?.url;
    }

    if (ingredientIds !== undefined) {
      if (ingredientIds.length > 0) {
        item.ingredients = await this.ingredientRepository.findBy({
          id: ingredientIds as any,
        });
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
        ar: `${originalItem.name.ar} (نسخة)`,
      },
      description: originalItem.description,
      image: originalItem.image,
      pricing: originalItem.pricing,
      tags: originalItem.tags,
      extras: originalItem.extras,
      ingredientsWithQuantity: originalItem.ingredientsWithQuantity,
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
