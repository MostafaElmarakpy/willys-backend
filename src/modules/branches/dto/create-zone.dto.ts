import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { BranchExists } from "../../../common/decorators/is-branch-exists.decorator";
import { IsValidPolygon } from "../../../common/decorators/is-valid-polygon.decorator";
import { BilingualStringOptional } from "../../../common/dto/bilingual-string.dto";

export class CreateZoneDto {
  @IsOptional()
  @ValidateNested({
    message:
      "Zone name must be provided in both Arabic and English if specified",
  })
  @Type(() => BilingualStringOptional)
  name?: BilingualStringOptional;

  @IsUUID(4, { message: "Branch ID must be a valid UUID" })
  @BranchExists({ message: "Branch with this ID does not exist" })
  branchId: string;

  @IsValidPolygon({
    message:
      "Polygon must be a valid GeoJSON polygon with proper coordinate structure",
  })
  polygon: {
    type: "Polygon";
    coordinates: number[][][];
  };

  @IsOptional()
  @IsNumber({}, { message: "Center latitude must be a valid number" })
  @Min(-90, { message: "Center latitude must be between -90 and 90 degrees" })
  @Max(90, { message: "Center latitude must be between -90 and 90 degrees" })
  @Type(() => Number)
  centerLatitude?: number;

  @IsOptional()
  @IsNumber({}, { message: "Center longitude must be a valid number" })
  @Min(-180, {
    message: "Center longitude must be between -180 and 180 degrees",
  })
  @Max(180, {
    message: "Center longitude must be between -180 and 180 degrees",
  })
  @Type(() => Number)
  centerLongitude?: number;

  @IsOptional()
  @IsNumber({}, { message: "Radius must be a valid number" })
  @Min(0.1, { message: "Radius must be at least 0.1 kilometers" })
  @Max(100, { message: "Radius cannot exceed 100 kilometers" })
  @Type(() => Number)
  radiusKm?: number;

  @IsOptional()
  @IsBoolean({ message: "Active status must be true or false" })
  isActive?: boolean;

  @IsOptional()
  @IsNumber({}, { message: "Priority must be a valid number" })
  @Min(0, { message: "Priority cannot be negative" })
  @Max(100, { message: "Priority cannot exceed 100" })
  @Type(() => Number)
  priority?: number;

  @IsNumber({}, { message: "Delivery fee must be a valid number" })
  @Min(0, { message: "Delivery fee cannot be negative" })
  @Type(() => Number)
  deliveryFee: number;
}
