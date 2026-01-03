import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, IsNull } from 'typeorm';
import { Bundle } from 'src/database/entities/bundle.entity';
import { CreateBundleDto } from './dto/bundle/create-bundle.dto';
import { UpdateBundleDto } from './dto/bundle/update-bundle.dto';
import { BundleFilterDto } from './dto/bundle/bundle-filter.dto';
import { BundleStatus } from 'src/common/enums/BundleStatus';
import { UploadMediaService } from 'src/services/upload-media/upload-media.service';

@Injectable()
export class BundlesService {
  constructor(
    @InjectRepository(Bundle)
    private readonly bundleRepository: Repository<Bundle>,
    private readonly uploadMediaService: UploadMediaService,
  ) {}

  async create(
    createBundleDto: CreateBundleDto,
    userId: string,
    files: { [fieldName: string]: Express.Multer.File[] },
  ): Promise<Bundle> {
    const { items, extras, ...bundleData } = createBundleDto;

    const bundle = this.bundleRepository.create({
      ...bundleData,
      createdBy: userId,
    });

    if (files['image']) {
      bundle.image = (
        await this.uploadMediaService.saveOneFile(
          files?.image,
          'properties',
          bundle.id,
        )
      )?.url;
    }

    if (items && items.length > 0) {
      bundle.items = items;
      bundle.numberOfItems = items.length;
    } else {
      bundle.numberOfItems = 0;
    }

    if (extras && extras.length > 0) {
      bundle.extras = extras;
    }

    return await this.bundleRepository.save(bundle);
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
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      fromDate,
      toDate,
    } = filterDto;

    const validSortFields = [
      'name',
      'price',
      'createdAt',
      'updatedAt',
      'status',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    let whereConditions: string[] = ['b."deletedAt" IS NULL'];
    let parameters: any[] = [];
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
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    let orderByClause = '';
    if (sortField === 'name') {
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
        b."numberOfItems",
        b.price,
        b.status,
        b."createdBy",
        b."updatedBy",
        b."createdAt",
        b."updatedAt",
        c.name as "categoryName"
      FROM bundles b
      LEFT JOIN categories c ON c.id = b."categoryId"
      ${whereClause}
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

    const total = parseInt(countResult[0].total);

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
      relations: ['category'],
    });

    if (!bundle) {
      throw new NotFoundException('Bundle not found');
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
    const { items, extras, ...bundleData } = updateBundleDto;

    Object.assign(bundle, bundleData);
    bundle.updatedBy = userId;

    if (items !== undefined) {
      if (items.length > 0) {
        bundle.items = items;
        bundle.numberOfItems = items.length;
      } else {
        bundle.items = [];
        bundle.numberOfItems = 0;
      }
    }

    if (extras !== undefined) {
      bundle.extras = extras;
    }

    if (files['image']) {
      bundle.image = (
        await this.uploadMediaService.saveOneFile(
          files?.image,
          'properties',
          bundle.id,
        )
      )?.url;
    }

    return await this.bundleRepository.save(bundle);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.bundleRepository.softDelete(id);
  }

  async findByCategory(categoryId: string): Promise<Bundle[]> {
    return await this.bundleRepository.find({
      where: { categoryId, deletedAt: IsNull() },
      relations: ['category'],
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
      numberOfItems: originalBundle.numberOfItems,
      price: originalBundle.price,
      status: BundleStatus.DRAFT,
      items: originalBundle.items,
      extras: originalBundle.extras,
      createdBy: userId,
    });

    return await this.bundleRepository.save(duplicatedBundle);
  }

  async archiveBundle(id: string, userId: string): Promise<Bundle> {
    const bundle = await this.findOne(id);
    bundle.status = BundleStatus.ARCHIVED;
    bundle.updatedBy = userId;
    return await this.bundleRepository.save(bundle);
  }
}
