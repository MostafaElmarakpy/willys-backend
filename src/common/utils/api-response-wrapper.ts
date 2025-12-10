import { HttpException, HttpStatus } from '@nestjs/common';

// Success Response Interface (matches current controller pattern)
export interface SuccessResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

// Error Response Interface (matches current NestJS exception format)
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// Paginated Response Interface
export interface PaginatedResponse<T> {
  statusCode: number;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message: string = 'Operation successful',
  statusCode: number = HttpStatus.OK,
): SuccessResponse<T> {
  return {
    statusCode,
    message,
    data,
  };
}

/**
 * Creates a standardized created response
 */
export function createCreatedResponse<T>(
  data: T,
  message: string = 'Resource created successfully',
): SuccessResponse<T> {
  return {
    statusCode: HttpStatus.CREATED,
    message,
    data,
  };
}

/**
 * Creates a standardized paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = 'Data retrieved successfully',
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    statusCode: HttpStatus.OK,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Creates a standardized error response and throws it
 */
export function createErrorResponse(
  message: string | string[],
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  error?: string,
): never {
  const response: ErrorResponse = {
    statusCode,
    message,
    ...(error && { error }),
  };

  throw new HttpException(response, statusCode);
}

/**
 * Predefined error responses
 */
export function throwBadRequest(message: string = 'Bad Request'): never {
  return createErrorResponse(message, HttpStatus.BAD_REQUEST, 'Bad Request');
}

export function throwUnauthorized(message: string = 'Unauthorized'): never {
  return createErrorResponse(message, HttpStatus.UNAUTHORIZED, 'Unauthorized');
}

export function throwForbidden(message: string = 'Forbidden'): never {
  return createErrorResponse(message, HttpStatus.FORBIDDEN, 'Forbidden');
}

export function throwNotFound(message: string = 'Resource not found'): never {
  return createErrorResponse(message, HttpStatus.NOT_FOUND, 'Not Found');
}

export function throwConflict(message: string = 'Conflict'): never {
  return createErrorResponse(message, HttpStatus.CONFLICT, 'Conflict');
}

export function throwValidationError(message: string | string[] = 'Validation failed'): never {
  return createErrorResponse(message, HttpStatus.BAD_REQUEST, 'Validation Error');
}

export function throwInternalError(message: string = 'Internal server error'): never {
  return createErrorResponse(message, HttpStatus.INTERNAL_SERVER_ERROR, 'Internal Server Error');
}