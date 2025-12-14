import { HttpException, HttpStatus } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export interface ValidationErrorDetail {
  field: string;
  error: string;
  value: unknown;
  code: string;
}

export interface ValidationErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  errors: ValidationErrorDetail[];
}

export class ValidationErrorFactory {
  static createValidationException(
    validationErrors: ValidationError[],
  ): HttpException {
    const detailedErrors = this.formatValidationErrors(validationErrors);

    // Use the first error as the main message, or fallback to generic message
    const mainMessage =
      detailedErrors.length > 0
        ? detailedErrors[0].field + ' ' + detailedErrors[0].error
        : 'Validation failed';

    const errorResponse: ValidationErrorResponse = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: mainMessage,
      error: 'Validation Error',
      errors: detailedErrors,
    };

    return new HttpException(errorResponse, HttpStatus.BAD_REQUEST);
  }

  private static formatValidationErrors(
    errors: ValidationError[],
    parentField = '',
  ): ValidationErrorDetail[] {
    const fieldErrors: ValidationErrorDetail[] = [];

    for (const error of errors) {
      const fieldName = parentField
        ? `${parentField}.${error.property}`
        : error.property;

      // Add constraint errors for this field
      if (error.constraints) {
        for (const [constraintKey, message] of Object.entries(
          error.constraints,
        )) {
          fieldErrors.push({
            field: fieldName,
            error: message,
            value: error.value,
            code: constraintKey.toUpperCase(),
          });
        }
      }

      // Recursively process nested errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatValidationErrors(
          error.children,
          fieldName,
        );
        fieldErrors.push(...nestedErrors);
      }
    }

    return fieldErrors;
  }
}
