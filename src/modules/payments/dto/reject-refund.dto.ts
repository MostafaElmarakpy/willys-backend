import { IsNotEmpty, IsString } from "class-validator";

export class RejectRefundDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}
