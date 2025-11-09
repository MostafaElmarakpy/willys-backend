import { ObjectLiteral } from 'typeorm';

export interface PaginationResult<Entity extends ObjectLiteral> {
  data: Entity[];
  total: number;
  pageNumber: number;
  limitNumber: number;
}

export interface PaginationParams {
  pageNumber: number;
  limitNumber: number;
}
