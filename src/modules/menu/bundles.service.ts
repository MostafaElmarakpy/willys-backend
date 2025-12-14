import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { Bundle } from 'src/database/entities/bundle.entity';
import { Item } from 'src/database/entities/item.entity';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { BundleFilterDto } from './dto/bundle-filter.dto';
import { BundleStatus } from 'src/common/enums/BundleStatus';

@Injectable()
export class BundlesService {
  constructor(
    @InjectRepository(Bundle)
    private readonly bundleRepository: Repository<Bundle>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
  ) {}

  async create(
    createBundleDto: CreateBundleDto,
    userId: string,
  ): Promise<Bundle> {
    const { itemIds, ...bundleData } = createBundleDto;

    const bundle = this.bundleRepository.create({
      ...bundleData,
      createdBy: userId,
    });

    if (itemIds && itemIds.length > 0) {
      const items = await this.itemRepository.findByIds(itemIds);
      bundle.items = items;
      bundle.numberOfItems = items.length;
    } else {
      bundle.numberOfItems = 0;
    }

    return await this.bundleRepository.save(bundle);
  }

  async findAll(filterDto: BundleFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      categoryId,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filterDto;

    const queryBuilder = this.bundleRepository
      .createQueryBuilder('bundle')
      .leftJoinAndSelect('bundle.category', 'category')
      .leftJoinAndSelect('bundle.items', 'items')
      .leftJoinAndSelect('bundle.createdByUser', 'createdBy')
      .leftJoinAndSelect('bundle.updatedByUser', 'updatedBy');

    if (search) {
      queryBuilder.andWhere(
        "(LOWER(bundle.name->>'ar') LIKE LOWER(:search) OR LOWER(bundle.name->>'en') LIKE LOWER(:search))",
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('bundle.status = :status', { status });
    }

    if (categoryId) {
      queryBuilder.andWhere('bundle.categoryId = :categoryId', { categoryId });
    }

    if (minPrice !== undefined) {
      queryBuilder.andWhere('bundle.price >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      queryBuilder.andWhere('bundle.price <= :maxPrice', { maxPrice });
    }

    queryBuilder.orderBy(`bundle.${sortBy}`, sortOrder);

    const total = await queryBuilder.getCount();
    const bundles = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

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
      where: { id },
      relations: ['category', 'items', 'createdByUser', 'updatedByUser'],
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
  ): Promise<Bundle> {
    const bundle = await this.findOne(id);
    const { itemIds, ...bundleData } = updateBundleDto;

    Object.assign(bundle, bundleData);
    bundle.updatedBy = userId;

    if (itemIds !== undefined) {
      if (itemIds.length > 0) {
        const items = await this.itemRepository.findByIds(itemIds);
        bundle.items = items;
        bundle.numberOfItems = items.length;
      } else {
        bundle.items = [];
        bundle.numberOfItems = 0;
      }
    }

    return await this.bundleRepository.save(bundle);
  }

  async remove(id: string): Promise<void> {
    const bundle = await this.findOne(id);
    await this.bundleRepository.remove(bundle);
  }

  async findByCategory(categoryId: string): Promise<Bundle[]> {
    return await this.bundleRepository.find({
      where: { categoryId },
      relations: ['category', 'items', 'createdByUser', 'updatedByUser'],
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
