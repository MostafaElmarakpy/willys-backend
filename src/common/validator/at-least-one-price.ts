import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

export function AtLeastOneValue(
  values: string[],
  validationOptions?: ValidationOptions,
) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: "atLeastOneValue",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: any, args: ValidationArguments) {
          const object = args.object as any;
          const listValues = values.map((value) => object[value]);
          return listValues.some(
            (value) => value !== undefined && value !== null,
          );
        },
        defaultMessage(_args: ValidationArguments) {
          return "At least one installment price (monthly, yearly, half year, or quarter) must be provided";
        },
      },
    });
  };
}
