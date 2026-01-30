import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "src/database/entities/category.entity";
import { UploadMediaService } from "src/services/upload-media/upload-media.service";
import { DataSource, IsNull, type Repository } from "typeorm";
import { CategoryOrderBy } from "./dto/category/category-filter.dto";
import { CreateCategoryDto } from "./dto/category/create-category.dto";
import { ReorderCategoriesDto } from "./dto/category/reorder-categories.dto";
import { UpdateCategoryDto } from "./dto/category/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    readonly categoryRepository: Repository<Category>,
    private readonly dataSource: DataSource,
    private readonly uploadMediaService: UploadMediaService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
    userId: string,
    files: { [fieldName: string]: Express.Multer.File[] },
  ): Promise<Category> {
    // Get the highest sortOrder value and add 1
    const maxSortOrder = await this.categoryRepository
      .createQueryBuilder("category")
      .select("MAX(category.sortOrder)", "max")
      .where("category.deletedAt IS NULL")
      .getRawOne();

    const nextSortOrder = (maxSortOrder?.max ?? -1) + 1;

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      sortOrder: nextSortOrder,
      createdBy: userId,
    });

    const savedCategory = await this.categoryRepository.save(category);

    // Handle image upload if provided
    if (files?.image) {
      savedCategory.image = (
        await this.uploadMediaService.saveOneFile(
          files.image,
          "properties",
          savedCategory.id,
        )
      )?.url;
      await this.categoryRepository.save(savedCategory);
    }

    return savedCategory;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    isActive?: string,
    sortBy?: CategoryOrderBy,
    sortOrder: "ASC" | "DESC" = "ASC",
  ) {
    const queryBuilder = this.categoryRepository
      .createQueryBuilder("category")
      .where("category.deletedAt IS NULL")
      .loadRelationCountAndMap("category.itemsCount", "category.items");

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        "(category.name ->> 'en' ILIKE :search OR category.name ->> 'ar' ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    // Status filter
    if (isActive === "true" || isActive === "false") {
      const isActiveBoolean = isActive === "true";
      queryBuilder.andWhere("category.isActive = :isActive", {
        isActive: isActiveBoolean,
      });
    }

    // Handle ordering based on sortBy parameter
    if (sortBy) {
      switch (sortBy) {
        case CategoryOrderBy.SORT_ORDER:
          queryBuilder.orderBy("category.sortOrder", sortOrder);
          break;
        case CategoryOrderBy.UPDATED_AT:
          queryBuilder.orderBy("category.updatedAt", sortOrder);
          break;
        case CategoryOrderBy.ITEMS_COUNT:
          // For ordering by items count, we need to use a subquery approach
          queryBuilder
            .addSelect((qb) => {
              return qb
                .select("COUNT(items.id)")
                .from("items", "items")
                .where("items.categoryId = category.id");
            }, "items_count")
            .orderBy("items_count", sortOrder);
          break;
        default:
          queryBuilder.orderBy("category.sortOrder", sortOrder);
      }
    } else {
      queryBuilder.orderBy("category.sortOrder", sortOrder);
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
      relations: ["items"],
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
    files: { [fieldName: string]: Express.Multer.File[] },
  ): Promise<Category> {
    const category = await this.findOne(id);

    Object.assign(category, updateCategoryDto, {
      updatedBy: userId,
    });

    // Handle image upload if provided
    if (files?.image) {
      category.image = (
        await this.uploadMediaService.saveOneFile(
          files.image,
          "properties",
          category.id,
        )
      )?.url;
    }

    return await this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.categoryRepository.softDelete(id);
  }

  async findActiveCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { isActive: true, deletedAt: IsNull() },
      order: { sortOrder: "ASC", createdAt: "DESC" },
    });
  }

  async reorderCategories(
    reorderDto: ReorderCategoriesDto,
  ): Promise<{ success: boolean; updatedCount: number }> {
    const { categories } = reorderDto;

    // Use a transaction to ensure all updates happen atomically
    return await this.dataSource.transaction(async (manager) => {
      const categoryRepo = manager.getRepository(Category);

      // Validate that all category IDs exist and are not deleted
      const categoryIds = categories.map((c) => c.id);
      const existingCategories = await categoryRepo.find({
        where: categoryIds.map((id) => ({ id, deletedAt: IsNull() })),
        select: ["id"],
      });

      if (existingCategories.length !== categories.length) {
        const existingIds = new Set(existingCategories.map((c) => c.id));
        const missingIds = categoryIds.filter((id) => !existingIds.has(id));
        throw new NotFoundException(
          `Categories not found: ${missingIds.join(", ")}`,
        );
      }

      // Update each category's sortOrder
      for (const categoryUpdate of categories) {
        await categoryRepo.update(
          { id: categoryUpdate.id },
          { sortOrder: categoryUpdate.sortOrder },
        );
      }

      return {
        success: true,
        updatedCount: categories.length,
      };
    });
  }
}
