import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { BilingualStringOptional } from '../../../common/dto/bilingual-string.dto';

class CoordinatesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: number[];
}

class PolygonDto {
  @IsString()
  type: 'Polygon';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinatesDto)
  coordinates: number[][][];
}

export class CreateZoneDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualStringOptional)
  name?: BilingualStringOptional;

  @IsUUID()
  branchId: string;

  @ValidateNested()
  @Type(() => PolygonDto)
  polygon: {
    type: 'Polygon';
    coordinates: number[][][];
  };

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  centerLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  centerLongitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  radiusKm?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;
}