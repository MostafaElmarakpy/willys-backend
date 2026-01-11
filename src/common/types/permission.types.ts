import { PermissionModule } from '../enums/PermissionModule';
import { PermissionAction } from '../enums/PermissionAction';

export type Permission = `${PermissionModule}:${PermissionAction}`;

export type PermissionsMap = Partial<
  Record<PermissionModule, PermissionAction[]>
>;

export const createPermission = (
  module: PermissionModule,
  action: PermissionAction,
): Permission => `${module}:${action}`;

export const MODULE_PERMISSIONS: Record<PermissionModule, PermissionAction[]> =
  {
    [PermissionModule.USERS]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
    [PermissionModule.CATEGORIES]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
    [PermissionModule.ITEMS]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.DUPLICATE,
      PermissionAction.ARCHIVE,
    ],
    [PermissionModule.BUNDLES]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.DUPLICATE,
      PermissionAction.ARCHIVE,
    ],
    [PermissionModule.INGREDIENTS]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
    [PermissionModule.BRANCHES]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.TOGGLE_STATUS,
      PermissionAction.VIEW_STATS,
    ],
    [PermissionModule.ZONES]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.TOGGLE_STATUS,
      PermissionAction.VIEW_STATS,
    ],
    [PermissionModule.BRANCH_MENU]: [
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.BULK_UPDATE,
    ],
    [PermissionModule.DISCOUNTS]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.DUPLICATE,
      PermissionAction.ASSIGN,
      PermissionAction.TOGGLE_STATUS,
    ],
    [PermissionModule.PAYMENTS]: [
      PermissionAction.READ,
      PermissionAction.VIEW_STATS,
    ],
    [PermissionModule.REFUNDS]: [
      PermissionAction.READ,
      PermissionAction.APPROVE,
      PermissionAction.REJECT,
    ],
    [PermissionModule.ROLES]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
      PermissionAction.ASSIGN,
    ],
    [PermissionModule.ORDERS]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.UPDATE_STATUS,
      PermissionAction.CANCEL,
      PermissionAction.VIEW_STATS,
      PermissionAction.EXPORT,
    ],
    [PermissionModule.ADDRESSES]: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
  };
