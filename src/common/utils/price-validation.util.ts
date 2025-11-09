import { BadRequestException } from '@nestjs/common';

export interface PriceValidationEntity {
  starting_price: number;
  name?: { en?: string; ar?: string } | string;
}

export interface PriceValidationOptions {
  itemName: string;
  parentName: string;
  itemIdentifier?: string;
  priceFieldName?: string; // Allow customization of the price field name in error message
}

export function validatePriceAgainstParent(
  itemPrice: number,
  parentEntity: PriceValidationEntity | null,
  options: PriceValidationOptions,
): void {
  // Skip validation if no parent entity
  if (!parentEntity) return;

  // Validate the price is positive
  if (!itemPrice || itemPrice <= 0) {
    const priceFieldName = options.priceFieldName || 'starting_price';
    throw new BadRequestException(`${options.itemName} ${priceFieldName.replace('_', ' ')} must be a positive number`);
  }

  // Check if item price is less than parent's starting price
  if (itemPrice < parentEntity.starting_price) {
    const parentName = getEntityName(parentEntity);
    const itemIdentifier = options.itemIdentifier ? ` with ID "${options.itemIdentifier}"` : '';
    const priceFieldName = options.priceFieldName || 'starting_price';
    
    const errorMessage = `${options.itemName} ${priceFieldName.replace('_', ' ')} (${itemPrice}) cannot be less than the ${options.parentName}'s starting price (${parentEntity.starting_price}) for ${options.parentName} "${parentName}"`;

    throw new BadRequestException({
      message: 'Validation failed',
      errors: [
        {
          key: priceFieldName,
          message: errorMessage + itemIdentifier,
        },
      ],
    });
  }
}


function getEntityName(entity: PriceValidationEntity): string {
  if (!entity.name) return 'Unknown';
  
  if (typeof entity.name === 'string') {
    return entity.name;
  }
  
  return entity.name.en || entity.name.ar || 'Unknown';
}
