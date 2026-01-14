import { Type } from "class-transformer";
import { IsNumber } from "class-validator";

export class ZoneCheckDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;
}
