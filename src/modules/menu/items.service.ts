import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ItemStatus } from "src/common/enums/ItemStatus";
import { Ingredient } from "src/database/entities/ingredient.entity";
import { Item } from "src/database/entities/item.entity";
import { UploadMediaService } from "src/services/upload-media/upload-media.service";
import { IsNull, type Repository } from "typeorm";
import { CreateItemDto } from "./dto/item/create-item.dto";
import { ItemFilterDto } from "./dto/item/item-filter.dto";
import { UpdateItemDto } from "./dto/item/update-item.dto";

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item) readonly itemRepository: Repository<Item>,
    @InjectRepository(Ingredient)
    readonly ingredientRepository: Repository<Ingredient>,
    private readonly uploadMediaService: UploadMediaService,
  ) {}

  async create(
    createItemDto: CreateItemDto,
    userId: string,
    files: { [fieldName: string]: Express.Multer.File[] },
  ): Promise<Item> {
    const { ingredientIds, ingredients, extras, tags, pricing, ...itemData } =
      createItemDto;

    // Convert pricing to the correct format for the entity
    let pricingValue:
      | number
      | {
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
          type: "number" | "object";
        };
    if (typeof pricing === "number") {
      // Direct number value
      pricingValue = pricing;
    } else if (typeof pricing === "string") {
      // String number value
      const price = parseFloat(pricing);
      if (Number.isNaN(price)) {
        throw new Error("Invalid price string");
      }
      pricingValue = price;
    } else if (
      typeof pricing === "object" &&
      pricing.type === "number" &&
      pricing.price
    ) {
      // Object with type: 'number' and price field
      pricingValue = parseFloat(pricing.price);
      if (Number.isNaN(pricingValue)) {
        throw new Error("Invalid price in pricing object");
      }
    } else {
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

    if (files?.image) {
      item.image = (
        await this.uploadMediaService.saveOneFile(
          files.image,
          "properties",
          item.id,
        )
      )?.url;
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
      sortBy = "createdAt",
      sortOrder = "DESC",
      fromDate,
      toDate,
    } = filterDto;

    const validSortFields = [
      "name",
      "pricing",
      "createdAt",
      "updatedAt",
      "sortOrder",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const whereConditions: string[] = ['i."deletedAt" IS NULL'];
    const parameters: any[] = [];
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
      whereConditions.push(
        `(CASE WHEN jsonb_typeof(i.pricing) = 'number' THEN (i.pricing::text)::numeric ELSE 0 END) >= $${paramIndex}`,
      );
      parameters.push(minPrice);
      paramIndex++;
    } else if (maxPrice !== undefined) {
      whereConditions.push(
        `(CASE WHEN jsonb_typeof(i.pricing) = 'number' THEN (i.pricing::text)::numeric ELSE 0 END) <= $${paramIndex}`,
      );
      parameters.push(maxPrice);
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
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    let orderByClause = "";
    if (sortField === "name") {
      orderByClause = `ORDER BY i.name ->> 'en' ${sortOrder}`;
    } else if (sortField === "pricing") {
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
        c.name as "categoryName"
      FROM items i
      LEFT JOIN categories c ON c.id = i."categoryId"
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT i.id) as total
      FROM items i
      LEFT JOIN categories c ON c.id = i."categoryId"
      ${whereClause}
    `;

    // Add pagination parameters
    const itemsParameters = [...parameters, limit, (page - 1) * limit];
    const countParameters = [...parameters];

    const [items, countResult] = await Promise.all([
      this.itemRepository.query(itemsQuery, itemsParameters),
      this.itemRepository.query(countQuery, countParameters),
    ]);

    const total = parseInt(countResult[0].total, 10);

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
      where: { id, deletedAt: IsNull() },
      relations: ["category", "ingredients"],
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
    const { ingredientIds, ingredients, extras, tags, pricing, ...itemData } =
      updateItemDto;
    const item = await this.findOne(id);

    Object.assign(item, itemData, {
      updatedBy: userId,
    });

    if (pricing !== undefined) {
      // Convert pricing to the correct format for the entity
      if (typeof pricing === "number") {
        // Direct number value
        item.pricing = pricing;
      } else if (typeof pricing === "string") {
        // String number value
        const price = parseFloat(pricing);
        if (Number.isNaN(price)) {
          throw new Error("Invalid price string");
        }
        item.pricing = price;
      } else if (
        typeof pricing === "object" &&
        pricing.type === "number" &&
        pricing.price
      ) {
        // Object with type: 'number' and price field
        const price = parseFloat(pricing.price);
        if (Number.isNaN(price)) {
          throw new Error("Invalid price in pricing object");
        }
        item.pricing = price;
      } else {
        // Direct assignment for other pricing formats
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

    if (files?.image) {
      item.image = (
        await this.uploadMediaService.saveOneFile(
          files.image,
          "properties",
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
    await this.findOne(id);
    await this.itemRepository.softDelete(id);
  }

  async findByCategory(categoryId: string): Promise<Item[]> {
    return await this.itemRepository.find({
      where: { categoryId, status: ItemStatus.ACTIVE, deletedAt: IsNull() },
      relations: ["ingredients"],
      order: { sortOrder: "ASC", createdAt: "DESC" },
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
