import { ObjectLiteral } from 'typeorm';
import { PaginationResult } from '../interfaces/pagination-result.interface';

export class PaginationUtils {
  static createEmptyResult<T extends ObjectLiteral>(): PaginationResult<T> {
    return {
      data: [],
      total: 0,
      pageNumber: 1,
      limitNumber: 10,
    };
  }

  static calculateTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }

  static hasNextPage(
    currentPage: number,
    totalPages: number
  ): boolean {
    return currentPage < totalPages;
  }

  static hasPreviousPage(currentPage: number): boolean {
    return currentPage > 1;
  }

  static createPaginationMetadata<T extends ObjectLiteral>(
    result: PaginationResult<T>
  ): {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  } {
    const totalPages = this.calculateTotalPages(
      result.total,
      result.limitNumber
    );

    return {
      currentPage: result.pageNumber,
      totalPages,
      totalItems: result.total,
      itemsPerPage: result.limitNumber,
      hasNext: this.hasNextPage(result.pageNumber, totalPages),
      hasPrevious: this.hasPreviousPage(result.pageNumber),
    };
  }
}
