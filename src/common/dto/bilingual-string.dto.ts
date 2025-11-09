import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BilingualString {
  @IsString()
  @IsNotEmpty()
  en: string;

  @IsString()
  @IsNotEmpty()
  ar: string;
}

export class BilingualStringOptional {
  @IsOptional()
  @IsString()
  en?: string;

  @IsOptional()
  @IsString()
  ar?: string;
}

export interface BilingualStringObject {
  en: string;
  ar: string;
}
