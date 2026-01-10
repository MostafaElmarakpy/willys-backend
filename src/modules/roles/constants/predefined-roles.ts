import { PermissionModule } from 'src/common/enums/PermissionModule';
import { PermissionAction } from 'src/common/enums/PermissionAction';
import { PermissionsMap } from 'src/common/types/permission.types';

interface PredefinedRole {
  name: string;
  displayName: string;
  description: string;
  permissions: PermissionsMap;
}

const ALL_CRUD = [
  PermissionAction.CREATE,
  PermissionAction.READ,
  PermissionAction.UPDATE,
  PermissionAction.DELETE,
];

export const PREDEFINED_ROLES: PredefinedRole[] = [
  {
    name: 'SUPER_ADMIN',
    displayName: 'Super Admin',
    description: 'Full system access with all permissions',
    permissions: {
      [PermissionModule.USERS]: [...ALL_CRUD],
      [PermissionModule.CATEGORIES]: [...ALL_CRUD],
      [PermissionModule.ITEMS]: [
        ...ALL_CRUD,
        PermissionAction.DUPLICATE,
        PermissionAction.ARCHIVE,
      ],
      [PermissionModule.BUNDLES]: [
        ...ALL_CRUD,
        PermissionAction.DUPLICATE,
        PermissionAction.ARCHIVE,
      ],
      [PermissionModule.INGREDIENTS]: [...ALL_CRUD],
      [PermissionModule.BRANCHES]: [
        ...ALL_CRUD,
        PermissionAction.TOGGLE_STATUS,
        PermissionAction.VIEW_STATS,
      ],
      [PermissionModule.ZONES]: [
        ...ALL_CRUD,
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
        ...ALL_CRUD,
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
      [PermissionModule.ROLES]: [...ALL_CRUD, PermissionAction.ASSIGN],
    },
  },
  {
    name: 'MANAGER',
    displayName: 'Manager',
    description:
      'Management access - most features except user management and roles',
    permissions: {
      [PermissionModule.CATEGORIES]: [...ALL_CRUD],
      [PermissionModule.ITEMS]: [
        ...ALL_CRUD,
        PermissionAction.DUPLICATE,
        PermissionAction.ARCHIVE,
      ],
      [PermissionModule.BUNDLES]: [
        ...ALL_CRUD,
        PermissionAction.DUPLICATE,
        PermissionAction.ARCHIVE,
      ],
      [PermissionModule.INGREDIENTS]: [...ALL_CRUD],
      [PermissionModule.BRANCHES]: [
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.TOGGLE_STATUS,
        PermissionAction.VIEW_STATS,
      ],
      [PermissionModule.ZONES]: [
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.TOGGLE_STATUS,
        PermissionAction.VIEW_STATS,
      ],
      [PermissionModule.BRANCH_MENU]: [
        PermissionAction.READ,
        PermissionAction.UPDATE,
        PermissionAction.BULK_UPDATE,
      ],
      [PermissionModule.DISCOUNTS]: [
        ...ALL_CRUD,
        PermissionAction.DUPLICATE,
        PermissionAction.ASSIGN,
        PermissionAction.TOGGLE_STATUS,
      ],
      [PermissionModule.PAYMENTS]: [
        PermissionAction.READ,
        PermissionAction.VIEW_STATS,
      ],
      [PermissionModule.REFUNDS]: [PermissionAction.READ],
    },
  },
  {
    name: 'STAFF',
    displayName: 'Staff',
    description: 'Basic staff access - read-only with limited actions',
    permissions: {
      [PermissionModule.CATEGORIES]: [PermissionAction.READ],
      [PermissionModule.ITEMS]: [PermissionAction.READ],
      [PermissionModule.BUNDLES]: [PermissionAction.READ],
      [PermissionModule.INGREDIENTS]: [PermissionAction.READ],
      [PermissionModule.BRANCHES]: [PermissionAction.READ],
      [PermissionModule.ZONES]: [PermissionAction.READ],
      [PermissionModule.BRANCH_MENU]: [
        PermissionAction.READ,
        PermissionAction.UPDATE,
      ],
      [PermissionModule.DISCOUNTS]: [PermissionAction.READ],
      [PermissionModule.PAYMENTS]: [PermissionAction.READ],
    },
  },
  {
    name: 'CASHIER',
    displayName: 'Cashier',
    description: 'Point of sale access - payments and menu viewing',
    permissions: {
      [PermissionModule.CATEGORIES]: [PermissionAction.READ],
      [PermissionModule.ITEMS]: [PermissionAction.READ],
      [PermissionModule.BUNDLES]: [PermissionAction.READ],
      [PermissionModule.DISCOUNTS]: [PermissionAction.READ],
      [PermissionModule.PAYMENTS]: [
        PermissionAction.READ,
        PermissionAction.VIEW_STATS,
      ],
      [PermissionModule.REFUNDS]: [PermissionAction.READ],
    },
  },
];
