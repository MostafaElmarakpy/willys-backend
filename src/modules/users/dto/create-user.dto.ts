import { Type } from "class-transformer";
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { CountryCode } from "libphonenumber-js/max";
import { IsUnique } from "src/common/decorators/is-unique.decorator";
import { UserGender } from "src/common/enums/UserGender";
import { UserRole } from "src/common/enums/UserRole";
import { UserStatus } from "src/common/enums/UserStatus";
import { IsPhoneNumberWithCountryCode } from "src/common/validator/is-phone-number-with-Country-code";
import { User } from "src/database/entities/user.entity";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  @IsUnique(User, "email")
  email?: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  @IsPhoneNumberWithCountryCode("phoneNumberCountryCode", {
    message: "Invalid phone number for the provided country code",
  })
  @IsUnique(User, "phoneNumber")
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  phoneNumberCountryCode?: CountryCode;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  @IsUUID()
  adminRoleId?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthday?: Date;

  @IsOptional()
  @IsEnum(UserGender)
  gender: UserGender;

  @IsOptional()
  @IsEnum(UserStatus)
  status!: UserStatus;

  @IsString()
  @IsNotEmpty()
  userLocale: string = "ar";
}
