import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Repository,
  SelectQueryBuilder,
  ObjectLiteral,
  getMetadataArgsStorage,
} from 'typeorm';
import { PaginationOptionsDto } from '../dto';

@Injectable()
export class QueryBuilderService {
  createBaseQuery<Entity extends ObjectLiteral>(
    repository: Repository<Entity>,
  ): SelectQueryBuilder<Entity> {
    return repository.createQueryBuilder('entity');
  }

  addRelations<Entity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<Entity>,
    relations?: string[],
    hiddenRelations?: string[],
  ): void {
    if (!relations) return;

    relations.forEach((relation: string) => {
      if (hiddenRelations?.includes(relation)) {
        queryBuilder.leftJoin(`entity.${relation}`, relation);
      } else {
        queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
      }
    });
  }

  applyRelationFilters<Entity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<Entity>,
    options: PaginationOptionsDto,
  ): void {
    const { relationFilterBy, relationFilterValue, whereHas } = options;

    // Apply whereHas filters
    if (whereHas?.length) {
      whereHas.forEach((whereHasRelation: string) => {
        queryBuilder.innerJoin(`entity.${whereHasRelation}`, whereHasRelation);
      });
    }

    // Apply relation filters
    if (relationFilterBy?.length) {
      relationFilterBy.forEach((field, index) => {
        const value = relationFilterValue?.[index];

        if (value !== undefined) {
          queryBuilder.andWhere(`${field} = :relationFilterValue${index}`, {
            [`relationFilterValue${index}`]: value,
          });
        } else {
          queryBuilder.andWhere(`${field} IS NOT NULL`);
        }
      });
    }
  }

  applySearchFilter<Entity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<Entity>,
    options: PaginationOptionsDto,
    repository: Repository<Entity>,
  ): void {
    const { search, searchField } = options;

    if (!search || !searchField) return;

    const validFields = this.getEntityValidFields(repository);
    if (!validFields.includes(searchField)) return;

    const columnMeta = repository.metadata.columns.find(
      (col) => col.propertyName === searchField,
    );

    if (!columnMeta) return;

    const isJsonColumn = ['json', 'jsonb'].includes(columnMeta.type as string);

    if (isJsonColumn) {
      queryBuilder.andWhere(
        `(entity.${searchField}->>'en' ILIKE :search OR entity.${searchField}->>'ar' ILIKE :search)`,
        { search: `%${search}%` },
      );
    } else {
      queryBuilder.andWhere(`entity.${searchField} ILIKE :search`, {
        search: `%${search}%`,
      });
    }
  }

  private getEntityName<Entity extends ObjectLiteral>(
    repository: Repository<Entity>,
  ): string | null {
    if (repository.target instanceof Function) {
      return repository.target.name;
    }
    return null;
  }

  applySorting<Entity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<Entity>,
    options: PaginationOptionsDto,
    repository: Repository<Entity>,
  ): void {
    const { sortBy, sortOrder } = options;

    if (!sortBy) return;

    const order = (sortOrder?.toUpperCase() as 'ASC' | 'DESC') || 'DESC';
    const entityName = this.getEntityName(repository);

    const virtualFieldAliases: Record<string, string> = {
      price: 'entity_starting_price',
      starting_price: 'entity_starting_price',
      startingPrice: 'entity_starting_price',
    };

    if (virtualFieldAliases[sortBy]) {
      const tempOrderAlias = `temp_order_${sortBy}`;
      const orderExpression = `(SELECT COALESCE(MIN(prop.price), entity.starting_price) FROM properties prop WHERE prop."projectId" = entity.id)`;

      queryBuilder.addSelect(orderExpression, tempOrderAlias);
      queryBuilder.addOrderBy(tempOrderAlias, order, 'NULLS LAST');
      return;
    }

    if (sortBy.includes('.')) {
      const [field, ...pathParts] = sortBy.split('.');
      const jsonPath = pathParts.join('.');

      queryBuilder
        .addSelect(`entity.${field}->>'${jsonPath}'`, 'json_order_field')
        .addOrderBy('json_order_field', order);
      return;
    }

    // Regular column sorting
    queryBuilder.addOrderBy(`entity.${sortBy}`, order, 'NULLS LAST');
  }

  applySimpleMode<Entity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<Entity>,
    options: PaginationOptionsDto,
  ): void {
    const { simple, simpleSelectFields, sortBy, searchField } = options;

    if (!simple) return;

    if (simpleSelectFields && !simpleSelectFields.includes('entity.id')) {
      throw new BadRequestException(
        'Simple select fields must include entity.id',
      );
    }

    const selectFields = simpleSelectFields ?? ['entity.id', 'entity.name'];
    const additionalFields: string[] = [];

    if (sortBy && !selectFields.includes(`entity.${sortBy}`)) {
      additionalFields.push(`entity.${sortBy}`);
    }

    if (searchField && !selectFields.includes(`entity.${searchField}`)) {
      additionalFields.push(`entity.${searchField}`);
    }

    queryBuilder.select([...selectFields, ...additionalFields]);
  }

  applyPagination<Entity extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<Entity>,
    pageNumber: number,
    limitNumber: number,
  ): void {
    queryBuilder.skip((pageNumber - 1) * limitNumber).take(limitNumber);
  }

  private getEntityValidFields<Entity extends ObjectLiteral>(
    repository: Repository<Entity>,
  ): string[] {
    return getMetadataArgsStorage()
      .columns.filter((column) => column.target === repository.target)
      .map((column) => column.propertyName);
  }
}
