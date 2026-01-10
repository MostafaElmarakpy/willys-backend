import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  RequiredPermission,
  PERMISSIONS_MODE_KEY,
} from '../decorators/permissions.decorator';
import { PermissionsMap } from '../types/permission.types';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    if (user.adminRole?.name === 'SUPER_ADMIN') {
      return true;
    }

    const userPermissions: PermissionsMap = user.adminRole?.permissions || {};

    const mode = this.reflector.getAllAndOverride<string>(
      PERMISSIONS_MODE_KEY,
      [context.getHandler(), context.getClass()],
    );

    let hasPermission: boolean;

    if (mode === 'AND') {
      hasPermission = requiredPermissions.every((perm) =>
        this.hasPermission(userPermissions, perm),
      );
    } else {
      hasPermission = requiredPermissions.some((perm) =>
        this.hasPermission(userPermissions, perm),
      );
    }

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }

  private hasPermission(
    userPermissions: PermissionsMap,
    required: RequiredPermission,
  ): boolean {
    const modulePermissions = userPermissions[required.module];
    if (!modulePermissions) {
      return false;
    }
    return modulePermissions.includes(required.action);
  }
}
