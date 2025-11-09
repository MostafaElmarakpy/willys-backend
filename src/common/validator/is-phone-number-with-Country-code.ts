import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

export function IsPhoneNumberWithCountryCode(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsPhoneNumberWithCountryCode',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const countryCode = (args.object as any)[relatedPropertyName];

          if (!countryCode) {
            return false; // If country code is not provided, validation fails
          }

          try {
            const phoneNumber = parsePhoneNumberFromString(
              value,
              countryCode as CountryCode,
            );
            return phoneNumber?.isValid() || false; // Validate the phone number
          } catch (error) {
            return false; // Return false if parsing or validation fails
          }
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be a valid phone number for the country code ${(args.object as any)[relatedPropertyName]}`;
        },
      },
    });
  };
}
