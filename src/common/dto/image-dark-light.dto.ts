import { IsNotEmpty, IsString } from 'class-validator';

export class DarkLightImage {
  @IsString()
  @IsNotEmpty()
  dark: string;

  @IsString()
  @IsNotEmpty()
  light: string;
}
