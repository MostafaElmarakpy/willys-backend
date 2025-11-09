import { HttpException, HttpStatus } from '@nestjs/common';

// Success Response Interface
export interface SuccessResponse<T> {
  success: boolean;
  status: number;
  data: T;
  message?: string;
}

// Error Response Interface
export interface ErrorResponse {
  message?: string;
  success: boolean;
  status: number;
  errors: {
    key: string;
    message: string;
  }[];
  debug?: any;
}

// Paginated Response Interface
export interface PaginatedResponse<T> {
  success: boolean;
  status: number;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filtersRelaxed?: boolean;
  relaxedFilters?: string[];
  message?: string;
}

/**
 * General success response handler.
 */
export function success<T>(
  data: T,
  statusCode: number = HttpStatus.OK,
  message: string = 'Request successful',
): SuccessResponse<T> {
  return {
    success: true,
    status: statusCode,
    data: data,
    message,
  };
}

/**
 * Success response for a single record.
 */
export function showOne<T>(
  data: T,
  statusCode: number = HttpStatus.OK,
): SuccessResponse<T> {
  return {
    success: true,
    status: statusCode,
    data: data,
  };
}

/**
 * Success response for a created resource.
 */
export function successCreate<T>(
  data: T,
  statusCode: number = HttpStatus.CREATED,
): SuccessResponse<T> {
  return {
    success: true,
    status: statusCode,
    data: data,
    message: 'Resource created successfully',
  };
}

/**
 * Paginated response handler.
 */
export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  filtersRelaxed?: boolean,
  relaxedFilters?: string[],
  message: string = 'Request successful',
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    status: HttpStatus.OK,
    data: data,
    total,
    page,
    limit,
    totalPages,
    filtersRelaxed,
    relaxedFilters,
    message,
  };
}

export function handleError(
  error: any,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  debug?: any,
): ErrorResponse {
  let message: string;
  let errors: { key: string; message: string }[] = [];

  if (error instanceof HttpException) {
    statusCode = error.getStatus();
    const response = error.getResponse() as any;
    message = response.message || 'An error occurred';
    errors = Array.isArray(response.message)
      ? response.message.map((msg: string) => ({ key: 'error', message: msg }))
      : [{ key: 'error', message }];
  } else if (error instanceof Error) {
    message = error.message;
    errors = [{ key: 'error', message }];
  } else if (typeof error === 'object' && error !== null) {
    message = 'Validation failed';
    errors = Object.entries(error).map(([key, value]) => ({
      key,
      message: Array.isArray(value) ? value.join(', ') : String(value),
    }));
  } else {
    message = 'An unexpected error occurred';
    errors = [{ key: 'error', message }];
  }

  throw new HttpException(
    {
      success: false,
      status: statusCode,
      message,
      errors,
      debug: process.env.NODE_ENV === 'development' ? debug : undefined,
    },
    statusCode,
  );
}

export function errorResponse(
  error: any,
  statusCode?: number,
  debug?: any,
): ErrorResponse {
  return handleError(error, statusCode, debug);
}

export function unauthorized(
  message: string = 'Unauthorized access',
): ErrorResponse {
  return handleError(message, HttpStatus.UNAUTHORIZED);
}

export function notFound(
  message: string = 'Resource not found',
): ErrorResponse {
  return handleError(message, HttpStatus.NOT_FOUND);
}

export function validationError(errors: any): ErrorResponse {
  return handleError(errors, HttpStatus.BAD_REQUEST);
}
