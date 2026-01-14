import { Transform, Type } from "class-transformer";
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { CountryCode } from "libphonenumber-js/max";
import { UserGender } from "src/common/enums/UserGender";
import { UserProvider } from "src/common/enums/UserProvider";
import { IsPhoneNumberWithCountryCode } from "src/common/validator/is-phone-number-with-Country-code";

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(["email", "phone"])
  registerMethod: "email" | "phone";

  @ValidateIf((o) => o.registerMethod === "email")
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ValidateIf((o) => o.registerMethod === "phone")
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.replace(" ", ""))
  @IsPhoneNumberWithCountryCode("phoneNumberCountryCode", {
    message: "Invalid phone number for the provided country code",
  })
  phoneNumber?: string;

  @ValidateIf((o) => o.registerMethod === "phone")
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(3)
  phoneNumberCountryCode: CountryCode;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsEnum(UserGender)
  gender: UserGender;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthday: Date;

  @IsEnum(UserProvider)
  provider: UserProvider = UserProvider.System;

  @IsString()
  @IsNotEmpty()
  userLocale: string = "ar";

  @IsString()
  @IsNotEmpty()
  callbackUrl: string;
}
