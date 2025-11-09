import { BadRequestException, Injectable } from '@nestjs/common';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { PaginationOptionsDto } from '../dto';
import {
  PaginationParams,
  PaginationResult,
} from '../interfaces/pagination-result.interface';
import { QueryBuilderService } from './query-builder.service';

@Injectable()
export class PaginationService {
  constructor(private readonly queryBuilderService: QueryBuilderService) {}

  /**
   * Generic pagination method for any entity
   */
  async findWithPagination<Entity extends ObjectLiteral>(
    repository: Repository<Entity>,
    options: PaginationOptionsDto,
    relations?: string[],
    modifyQueryBuilder?: (queryBuilder: SelectQueryBuilder<Entity>) => void,
  ): Promise<PaginationResult<Entity>> {
    try {
      const params = this.validatePaginationParams(options);
      const queryBuilder = await this.buildQuery(
        repository,
        options,
        relations,
        modifyQueryBuilder,
      );

      return await this.executeQuery(queryBuilder, params);
    } catch (error) {
      this.handleError(error);
    }
  }

  private async buildQuery<Entity extends ObjectLiteral>(
    repository: Repository<Entity>,
    options: PaginationOptionsDto,
    relations?: string[],
    modifyQueryBuilder?: (queryBuilder: SelectQueryBuilder<Entity>) => void,
  ): Promise<SelectQueryBuilder<Entity>> {
    const queryBuilder = this.queryBuilderService.createBaseQuery(repository);

    this.queryBuilderService.addRelations(
      queryBuilder,
      relations,
      options.hiddenRelationFilterBy,
    );

    this.queryBuilderService.applyRelationFilters(queryBuilder, options);
    this.queryBuilderService.applySearchFilter(
      queryBuilder,
      options,
      repository,
    );
    this.queryBuilderService.applySimpleMode(queryBuilder, options);

    if (modifyQueryBuilder) {
      modifyQueryBuilder(queryBuilder);
    }

    this.queryBuilderService.applySorting(queryBuilder, options, repository);

    return queryBuilder;
  }

  private async executeQuery<Entity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<Entity>,
    params: PaginationParams,
  ): Promise<PaginationResult<Entity>> {
    this.queryBuilderService.applyPagination(
      queryBuilder,
      params.pageNumber,
      params.limitNumber,
    );

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      pageNumber: params.pageNumber,
      limitNumber: params.limitNumber,
    };
  }

  private validatePaginationParams(
    options: PaginationOptionsDto,
  ): PaginationParams {
    const pageNumber = Number(options.page);
    const limitNumber = Number(options.limit);

    if (
      isNaN(pageNumber) ||
      isNaN(limitNumber) ||
      pageNumber < 1 ||
      limitNumber < 1
    ) {
      throw new BadRequestException(
        'Invalid page or limit value. Must be positive numbers.',
      );
    }

    return { pageNumber, limitNumber };
  }

  private handleError(error: any): never {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(
      `Error processing pagination: ${error.message}`,
    );
  }
}
