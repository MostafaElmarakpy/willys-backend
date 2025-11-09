import { Injectable } from '@nestjs/common';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { FilterStrategy } from '../interfaces/filter-strategy.interface';

@Injectable()
export abstract class BaseFilterStrategy<Entity extends ObjectLiteral>
  implements FilterStrategy<Entity>
{
  abstract applyFilters(queryBuilder: SelectQueryBuilder<Entity>): void;

  protected applyNumericRangeFilter(
    queryBuilder: SelectQueryBuilder<any>,
    alias: string,
    column: string,
    minValue?: number,
    maxValue?: number,
    paramPrefix: string = '',
  ): void {
    if (minValue !== undefined) {
      queryBuilder.andWhere(`${alias}.${column} >= :${paramPrefix}Min`, {
        [`${paramPrefix}Min`]: minValue,
      });
    }

    if (maxValue !== undefined) {
      queryBuilder.andWhere(`${alias}.${column} <= :${paramPrefix}Max`, {
        [`${paramPrefix}Max`]: maxValue,
      });
    }
  }

  protected applyExistsSubquery(
    queryBuilder: SelectQueryBuilder<Entity>,
    subqueryBuilder: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>,
  ): void {
    queryBuilder.andWhere((qb) => {
      const subquery = subqueryBuilder(qb.subQuery());
      return `EXISTS ${subquery.getQuery()}`;
    });
  }

  protected applyArrayFilter(
    queryBuilder: SelectQueryBuilder<any>,
    alias: string,
    column: string,
    values: string[],
    paramName: string,
  ): void {
    if (!Array.isArray(values) || values.length === 0) return;

    queryBuilder.andWhere(`${alias}.${column} IN (:...${paramName})`, {
      [paramName]: values,
    });
  }
}
