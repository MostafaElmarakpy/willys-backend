import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          return value instanceof Date && value > new Date();
        },
        defaultMessage(): string {
          return 'Date must be in the future';
        },
      },
    });
  };
}

export function IsFutureYear(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'isFutureYear',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any) {
          const currentYear = new Date().getFullYear();
          return typeof value === 'number' && value >= currentYear;
        },
        defaultMessage(): string {
          return 'Year must be current year or in the future';
        },
      },
    });
  };
}
