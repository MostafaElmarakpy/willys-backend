import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginationOptionsDto } from '../dto';

export interface FilterStrategy<Entity extends ObjectLiteral> {
  applyFilters(
    queryBuilder: SelectQueryBuilder<Entity>,
    options: PaginationOptionsDto,
  ): void;
}

export interface FilterContext {
  entityName: string;
  validFields: string[];
}
