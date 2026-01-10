import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsUniqueConstraint } from '../validator/is-unique.constraint';

export function IsUnique(
  entityClass: any,
  column: string | string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [entityClass, column],
      validator: IsUniqueConstraint,
    });
  };
}
