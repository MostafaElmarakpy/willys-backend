import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { CountryCode } from "libphonenumber-js/max";
import { IsPhoneNumberWithCountryCode } from "src/common/validator/is-phone-number-with-Country-code";

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @IsEnum(["email", "phone"])
  loginMethod: "email" | "phone";

  @ValidateIf((o) => o.loginMethod === "email")
  @ValidateIf((o) => o.loginMethod === "phone")
  @IsString()
  @IsEmail({}, { message: "Enter a valid email address" })
  @Transform(({ value }) => value.trim())
  @MinLength(5, { message: "Email must be at least 5 characters long" })
  @IsPhoneNumberWithCountryCode("phoneNumberCountryCode", {
    message: "Invalid phone number for the provided country code",
  })
  identifier: string;

  @ValidateIf((o) => o.loginMethod === "phone")
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(3)
  phoneNumberCountryCode: CountryCode;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: "Password must be at least 6 characters long" })
  password: string;
}
