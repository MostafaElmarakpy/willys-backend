import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
