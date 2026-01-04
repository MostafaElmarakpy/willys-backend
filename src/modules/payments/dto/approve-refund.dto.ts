import { IsOptional, IsString } from 'class-validator';

export class ApproveRefundDto {
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
