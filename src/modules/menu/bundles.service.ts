import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { BundleStatus } from "src/common/enums/BundleStatus";
import { Bundle } from "src/database/entities/bundle.entity";
import { BundleComponent } from "src/database/entities/bundle-component.entity";
import { BundleComponentItem } from "src/database/entities/bundle-component-item.entity";
import { UploadMediaService } from "src/services/upload-media/upload-media.service";
import { IsNull, type Repository } from "typeorm";
import { BundleFilterDto } from "./dto/bundle/bundle-filter.dto";
import { CreateBundleDto } from "./dto/bundle/create-bundle.dto";
import { UpdateBundleDto } from "./dto/bundle/update-bundle.dto";

@Injectable()
export class BundlesService {
  constructor(
    @InjectRepository(Bundle) readonly bundleRepository: Repository<Bundle>,
    @InjectRepository(BundleComponent)
    readonly bundleComponentRepository: Repository<BundleComponent>,
    @InjectRepository(BundleComponentItem)
    readonly bundleComponentItemRepository: Repository<BundleComponentItem>,
    private readonly uploadMediaService: UploadMediaService,
  ) {}

  async create(
    createBundleDto: CreateBundleDto,
    userId: string,
    files: { [fieldName: string]: Express.Multer.File[] },
  ): Promise<Bundle> {
    const { components, extras, tags, ...bundleData } = createBundleDto;

    // Create bundle entity
    const bundle = this.bundleRepository.create({
      ...bundleData,
      createdBy: userId,
      extras: extras || undefined,
      tags: tags || undefined,
    });

    if (files?.image) {
      bundle.image = (
        await this.uploadMediaService.saveOneFile(
          files?.image,
          "properties",
          bundle.id,
        )
      )?.url;
    }

    // Use transaction to ensure proper order of saves
    return await this.bundleRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Step 1: Save the bundle first
        const savedBundle = await transactionalEntityManager.save(
          Bundle,
          bundle,
        );

        // Step 2: Save components if they exist
        if (components && components.length > 0) {
          for (let index = 0; index < components.length; index++) {
            const componentDto = components[index];

            // Create and save component
            const component = this.bundleComponentRepository.create({
              bundleId: savedBundle.id,
              categoryId: componentDto.categoryId,
              defaultItemId: componentDto.defaultItemId,
              quantity: componentDto.quantity,
              sortOrder: componentDto.sortOrder ?? index,
            });

            const savedComponent = await transactionalEntityManager.save(
              BundleComponent,
              component,
            );

            // Step 3: Save component items if they exist
            if (componentDto.items && componentDto.items.length > 0) {
              const componentItems = componentDto.items.map(
                (itemDto, itemIndex) => {
                  return this.bundleComponentItemRepository.create({
                    componentId: savedComponent.id,
                    itemId: itemDto.itemId,
                    extraCost: itemDto.extraCost,
                    sortOrder: itemDto.sortOrder ?? itemIndex,
                  });
                },
              );

              await transactionalEntityManager.save(
                BundleComponentItem,
                componentItems,
              );
            }
          }
        }

        // Return the saved bundle
        return savedBundle;
      },
    );
  }

  async findAll(filterDto: BundleFilterDto) {
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
      "price",
      "createdAt",
      "updatedAt",
      "status",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const whereConditions: string[] = ['b."deletedAt" IS NULL'];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(
        `(b.name ->> 'en' ILIKE $${paramIndex} OR b.name ->> 'ar' ILIKE $${paramIndex} OR b.description ->> 'en' ILIKE $${paramIndex} OR b.description ->> 'ar' ILIKE $${paramIndex})`,
      );
      parameters.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`b.status = $${paramIndex}`);
      parameters.push(status);
      paramIndex++;
    }

    if (categoriesIds) {
      const categoryIdsArray = Array.isArray(categoriesIds)
        ? categoriesIds
        : [categoriesIds];
      if (categoryIdsArray.length > 0) {
        whereConditions.push(`b."categoryId" = ANY($${paramIndex})`);
        parameters.push(categoryIdsArray);
        paramIndex++;
      }
    }

    if (minPrice !== undefined && maxPrice !== undefined) {
      whereConditions.push(
        `b.price BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
      );
      parameters.push(minPrice, maxPrice);
      paramIndex += 2;
    } else if (minPrice !== undefined) {
      whereConditions.push(`b.price >= $${paramIndex}`);
      parameters.push(minPrice);
      paramIndex++;
    } else if (maxPrice !== undefined) {
      whereConditions.push(`b.price <= $${paramIndex}`);
      parameters.push(maxPrice);
      paramIndex++;
    }

    if (fromDate && toDate) {
      whereConditions.push(
        `b."updatedAt" BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
      );
      parameters.push(fromDate, toDate);
      paramIndex += 2;
    } else if (fromDate) {
      whereConditions.push(`b."updatedAt" >= $${paramIndex}`);
      parameters.push(fromDate);
      paramIndex++;
    } else if (toDate) {
      whereConditions.push(`b."updatedAt" <= $${paramIndex}`);
      parameters.push(toDate);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    let orderByClause = "";
    if (sortField === "name") {
      orderByClause = `ORDER BY b.name ->> 'en' ${sortOrder}`;
    } else {
      orderByClause = `ORDER BY b."${sortField}" ${sortOrder}`;
    }

    const bundlesQuery = `
      SELECT
        b.id,
        b.name,
        b.description,
        b.image,
        b."categoryId",
        COALESCE(SUM(bc.quantity), 0) as "numberOfItems",
        b.price,
        b.status,
        b.tags,
        b."createdBy",
        b."updatedBy",
        b."createdAt",
        b."updatedAt",
        c.name as "categoryName"
      FROM bundles b
      LEFT JOIN categories c ON c.id = b."categoryId"
      LEFT JOIN bundle_components bc ON bc."bundleId" = b.id AND bc."deletedAt" IS NULL
      ${whereClause}
      GROUP BY b.id, c.name
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM bundles b
      ${whereClause}
    `;

    // Add pagination parameters
    const bundlesParameters = [...parameters, limit, (page - 1) * limit];
    const countParameters = [...parameters];

    const [bundles, countResult] = await Promise.all([
      this.bundleRepository.query(bundlesQuery, bundlesParameters),
      this.bundleRepository.query(countQuery, countParameters),
    ]);

    const total = parseInt(countResult[0].total, 10);

    return {
      bundles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Bundle> {
    const bundle = await this.bundleRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: [
        "category",
        "components",
        "components.category",
        "components.defaultItem",
        "components.items",
        "components.items.item",
      ],
    });

    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }

    return bundle;
  }

  async update(
    id: string,
    updateBundleDto: UpdateBundleDto,
    userId: string,
    files: { [fieldName: string]: Express.Multer.File[] },
  ): Promise<Bundle> {
    const bundle = await this.findOne(id);
    const { components, extras, tags, ...bundleData } = updateBundleDto;

    Object.assign(bundle, bundleData);
    bundle.updatedBy = userId;

    if (extras !== undefined) {
      bundle.extras = extras;
    }

    if (tags !== undefined) {
      bundle.tags = tags;
    }

    if (files?.image) {
      bundle.image = (
        await this.uploadMediaService.saveOneFile(
          files?.image,
          "properties",
          bundle.id,
        )
      )?.url;
    }

    // Use transaction to ensure proper order of saves
    return await this.bundleRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Step 1: Save the bundle first (without components)
        const savedBundle = await transactionalEntityManager.save(
          Bundle,
          bundle,
        );

        // Step 2: Handle components if they were provided
        if (components !== undefined) {
          // Remove existing components (cascade will delete component items)
          if (bundle.components && bundle.components.length > 0) {
            await transactionalEntityManager.remove(
              BundleComponent,
              bundle.components,
            );
          }

          // Create and save new components
          if (components.length > 0) {
            for (let index = 0; index < components.length; index++) {
              const componentDto = components[index];

              // Create and save component
              const component = this.bundleComponentRepository.create({
                bundleId: savedBundle.id,
                categoryId: componentDto.categoryId,
                defaultItemId: componentDto.defaultItemId,
                quantity: componentDto.quantity,
                sortOrder: componentDto.sortOrder ?? index,
              });

              const savedComponent = await transactionalEntityManager.save(
                BundleComponent,
                component,
              );

              // Step 3: Save component items if they exist
              if (componentDto.items && componentDto.items.length > 0) {
                const componentItems = componentDto.items.map(
                  (itemDto, itemIndex) => {
                    return this.bundleComponentItemRepository.create({
                      componentId: savedComponent.id,
                      itemId: itemDto.itemId,
                      extraCost: itemDto.extraCost,
                      sortOrder: itemDto.sortOrder ?? itemIndex,
                    });
                  },
                );

                await transactionalEntityManager.save(
                  BundleComponentItem,
                  componentItems,
                );
              }
            }
          }
        }

        // Return the updated bundle
        return savedBundle;
      },
    );
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.bundleRepository.softDelete(id);
  }

  async findByCategory(categoryId: string): Promise<Bundle[]> {
    return await this.bundleRepository.find({
      where: { categoryId, deletedAt: IsNull() },
      relations: ["category"],
    });
  }

  async duplicate(id: string, userId: string): Promise<Bundle> {
    const originalBundle = await this.findOne(id);

    const duplicatedBundle = this.bundleRepository.create({
      name: {
        ar: `${originalBundle.name.ar} - نسخة`,
        en: `${originalBundle.name.en} - Copy`,
      },
      description: originalBundle.description,
      image: originalBundle.image,
      categoryId: originalBundle.categoryId,
      price: originalBundle.price,
      status: BundleStatus.DRAFT,
      extras: originalBundle.extras,
      tags: originalBundle.tags,
      createdBy: userId,
    });

    // Deep copy components
    if (originalBundle.components && originalBundle.components.length > 0) {
      duplicatedBundle.components = originalBundle.components.map(
        (component) => {
          const newComponent = this.bundleComponentRepository.create({
            categoryId: component.categoryId,
            defaultItemId: component.defaultItemId,
            quantity: component.quantity,
            sortOrder: component.sortOrder,
          });

          // Deep copy component items
          if (component.items && component.items.length > 0) {
            newComponent.items = component.items.map((item) => {
              return this.bundleComponentItemRepository.create({
                itemId: item.itemId,
                extraCost: item.extraCost,
                sortOrder: item.sortOrder,
              });
            });
          }

          return newComponent;
        },
      );
    }

    return await this.bundleRepository.save(duplicatedBundle);
  }

  async archiveBundle(id: string, userId: string): Promise<Bundle> {
    const bundle = await this.findOne(id);
    bundle.status = BundleStatus.ARCHIVED;
    bundle.updatedBy = userId;
    return await this.bundleRepository.save(bundle);
  }
}
