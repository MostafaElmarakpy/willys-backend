import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class SetAvailabilityDto {
  @ApiProperty({
    description: "Whether the item should be available at this branch",
    example: false,
  })
  @IsBoolean()
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: "Reason for changing availability (e.g., out of stock)",
    example: "Ingredient shortage at this branch",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
