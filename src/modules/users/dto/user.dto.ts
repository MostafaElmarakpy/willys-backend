import { Expose } from "class-transformer";

export class UserDto {
  @Expose()
  id: string;
  @Expose()
  email: string;
  @Expose()
  fullName: string;
  @Expose()
  phoneNumber: string | null;
  @Expose()
  phoneNumberCountryCode: string | null;
}
