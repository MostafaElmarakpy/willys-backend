import { SetMetadata } from '@nestjs/common';
import { PermissionModule } from '../enums/PermissionModule';
import { PermissionAction } from '../enums/PermissionAction';

export const PERMISSIONS_KEY = 'permissions';

export interface RequiredPermission {
  module: PermissionModule;
  action: PermissionAction;
}

export const Permission = (
  module: PermissionModule,
  action: PermissionAction,
) => SetMetadata(PERMISSIONS_KEY, [{ module, action }]);

export const Permissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const PERMISSIONS_MODE_KEY = 'permissions_mode';
export const RequireAllPermissions = () =>
  SetMetadata(PERMISSIONS_MODE_KEY, 'AND');
