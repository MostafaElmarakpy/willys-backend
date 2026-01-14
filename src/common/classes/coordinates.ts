import { IsNotEmpty, IsNumber, Max, Min } from "class-validator";

export class Coordinate {
  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;
}
