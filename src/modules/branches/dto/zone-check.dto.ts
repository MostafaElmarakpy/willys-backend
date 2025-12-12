import { IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ZoneCheckDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNumber()
  @Type(() => Number)
  longitude: number;
}
