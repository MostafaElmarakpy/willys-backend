import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryAvailabilityUpdate {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Whether the category should be available',
    example: false,
  })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Reason for the change',
    example: 'Seasonal category not available',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ItemAvailabilityUpdate {
  @ApiProperty({
    description: 'Item ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  itemId: string;

  @ApiProperty({
    description: 'Whether the item should be available',
    example: false,
  })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Reason for the change',
    example: 'Out of stock',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BundleAvailabilityUpdate {
  @ApiProperty({
    description: 'Bundle ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID()
  bundleId: string;

  @ApiProperty({
    description: 'Whether the bundle should be available',
    example: false,
  })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Reason for the change',
    example: 'Promotion ended',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BulkUpdateAvailabilityDto {
  @ApiPropertyOptional({
    description: 'Categories to update',
    type: [CategoryAvailabilityUpdate],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryAvailabilityUpdate)
  categories?: CategoryAvailabilityUpdate[];

  @ApiPropertyOptional({
    description: 'Items to update',
    type: [ItemAvailabilityUpdate],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemAvailabilityUpdate)
  items?: ItemAvailabilityUpdate[];

  @ApiPropertyOptional({
    description: 'Bundles to update',
    type: [BundleAvailabilityUpdate],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleAvailabilityUpdate)
  bundles?: BundleAvailabilityUpdate[];
}
