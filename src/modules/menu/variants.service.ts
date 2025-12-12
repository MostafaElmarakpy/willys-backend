import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variant } from 'src/database/entities/variant.entity';
import { VariantValue } from 'src/database/entities/variant-value.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateVariantValueDto } from './dto/create-variant-value.dto';
import { UpdateVariantValueDto } from './dto/update-variant-value.dto';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(VariantValue)
    private readonly variantValueRepository: Repository<VariantValue>,
  ) {}

  async createVariant(
    createVariantDto: CreateVariantDto,
    userId: string,
  ): Promise<Variant> {
    const variant = this.variantRepository.create({
      ...createVariantDto,
      createdBy: userId,
    });
    return await this.variantRepository.save(variant);
  }

  async findAllVariants(page: number = 1, limit: number = 10, search?: string) {
    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.values', 'values')
      .leftJoinAndSelect('variant.createdByUser', 'createdBy')
      .leftJoinAndSelect('variant.updatedByUser', 'updatedBy')
      .orderBy('variant.sortOrder', 'ASC')
      .addOrderBy('variant.createdAt', 'DESC')
      .addOrderBy('values.sortOrder', 'ASC');

    if (search) {
      queryBuilder.where(
        "(variant.name ->> 'en' ILIKE :search OR variant.name ->> 'ar' ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const [variants, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      data: variants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneVariant(id: string): Promise<Variant> {
    const variant = await this.variantRepository.findOne({
      where: { id },
      relations: ['values', 'createdByUser', 'updatedByUser'],
      order: {
        values: {
          sortOrder: 'ASC',
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(`Variant with ID ${id} not found`);
    }

    return variant;
  }

  async updateVariant(
    id: string,
    updateVariantDto: UpdateVariantDto,
    userId: string,
  ): Promise<Variant> {
    const variant = await this.findOneVariant(id);

    Object.assign(variant, updateVariantDto, {
      updatedBy: userId,
    });

    return await this.variantRepository.save(variant);
  }

  async removeVariant(id: string): Promise<void> {
    const variant = await this.findOneVariant(id);
    await this.variantRepository.remove(variant);
  }

  async createVariantValue(
    createVariantValueDto: CreateVariantValueDto,
    userId: string,
  ): Promise<VariantValue> {
    const variant = await this.findOneVariant(createVariantValueDto.variantId);

    const variantValue = this.variantValueRepository.create({
      ...createVariantValueDto,
      createdBy: userId,
    });

    return await this.variantValueRepository.save(variantValue);
  }

  async findVariantValues(variantId: string): Promise<VariantValue[]> {
    return await this.variantValueRepository.find({
      where: { variantId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      relations: ['createdByUser', 'updatedByUser'],
    });
  }

  async findOneVariantValue(id: string): Promise<VariantValue> {
    const variantValue = await this.variantValueRepository.findOne({
      where: { id },
      relations: ['variant', 'createdByUser', 'updatedByUser'],
    });

    if (!variantValue) {
      throw new NotFoundException(`Variant value with ID ${id} not found`);
    }

    return variantValue;
  }

  async updateVariantValue(
    id: string,
    updateVariantValueDto: UpdateVariantValueDto,
    userId: string,
  ): Promise<VariantValue> {
    const variantValue = await this.findOneVariantValue(id);

    Object.assign(variantValue, updateVariantValueDto, {
      updatedBy: userId,
    });

    return await this.variantValueRepository.save(variantValue);
  }

  async removeVariantValue(id: string): Promise<void> {
    const variantValue = await this.findOneVariantValue(id);
    await this.variantValueRepository.remove(variantValue);
  }

  async findActiveVariants() {
    return await this.variantRepository.find({
      where: { isActive: true },
      relations: ['values'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }
}
