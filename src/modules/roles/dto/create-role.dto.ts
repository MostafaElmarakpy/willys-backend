import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { PermissionsMap } from "src/common/types/permission.types";

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  permissions: PermissionsMap;
}
