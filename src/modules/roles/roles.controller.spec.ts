import { Test, type TestingModule } from "@nestjs/testing";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

describe("RolesController", () => {
  let controller: RolesController;
  let rolesService: jest.Mocked<RolesService>;

  const mockRoleId = "role-123";
  const mockUserId = "user-123";

  const mockRole = {
    id: mockRoleId,
    name: "Admin",
    description: "Administrator role",
    permissions: ["users:read", "users:write"],
  };

  const mockUser = {
    id: mockUserId,
    email: "user@example.com",
    roleId: mockRoleId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            findAll: jest.fn(),
            getAvailablePermissions: jest.fn(),
            findOne: jest.fn(),
            getUsersCountByRole: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            assignRoleToUser: jest.fn(),
            removeRoleFromUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated roles", async () => {
      const paginatedResult = {
        roles: [mockRole],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      rolesService.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(rolesService.findAll).toHaveBeenCalledWith(1, 10, undefined, "DESC");
      expect(result.message).toBe("Roles retrieved successfully");
      expect(result.data).toEqual(paginatedResult);
    });

    it("should use default pagination values", async () => {
      rolesService.findAll.mockResolvedValue({ roles: [], total: 0 } as any);

      await controller.findAll({});

      expect(rolesService.findAll).toHaveBeenCalledWith(1, 10, undefined, "DESC");
    });
  });

  describe("getAvailablePermissions", () => {
    it("should return available permissions", async () => {
      const permissions = [
        { module: "users", actions: ["read", "write", "delete"] },
        { module: "orders", actions: ["read", "write"] },
      ];
      rolesService.getAvailablePermissions.mockReturnValue(permissions as any);

      const result = await controller.getAvailablePermissions();

      expect(rolesService.getAvailablePermissions).toHaveBeenCalled();
      expect(result.message).toBe("Available permissions retrieved successfully");
      expect(result.data).toEqual(permissions);
    });
  });

  describe("findOne", () => {
    it("should return role with users count", async () => {
      rolesService.findOne.mockResolvedValue(mockRole as any);
      rolesService.getUsersCountByRole.mockResolvedValue(5);

      const result = await controller.findOne(mockRoleId);

      expect(rolesService.findOne).toHaveBeenCalledWith(mockRoleId);
      expect(rolesService.getUsersCountByRole).toHaveBeenCalledWith(mockRoleId);
      expect(result.message).toBe("Role retrieved successfully");
      expect(result.data.usersCount).toBe(5);
    });
  });

  describe("create", () => {
    it("should create a new role", async () => {
      const createDto = {
        name: "New Role",
        description: "A new role",
        permissions: ["users:read"],
      } as any;
      rolesService.create.mockResolvedValue(mockRole as any);

      const result = await controller.create(createDto);

      expect(rolesService.create).toHaveBeenCalledWith(createDto);
      expect(result.message).toBe("Role created successfully");
    });
  });

  describe("update", () => {
    it("should update a role", async () => {
      const updateDto = { name: "Updated Role" } as any;
      const updatedRole = { ...mockRole, name: "Updated Role" };
      rolesService.update.mockResolvedValue(updatedRole as any);

      const result = await controller.update(mockRoleId, updateDto);

      expect(rolesService.update).toHaveBeenCalledWith(mockRoleId, updateDto);
      expect(result.message).toBe("Role updated successfully");
    });
  });

  describe("remove", () => {
    it("should delete a role", async () => {
      rolesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockRoleId);

      expect(rolesService.remove).toHaveBeenCalledWith(mockRoleId);
      expect(result.message).toBe("Role deleted successfully");
    });
  });

  describe("assignRole", () => {
    it("should assign role to user", async () => {
      const assignDto = { userId: mockUserId, roleId: mockRoleId };
      rolesService.assignRoleToUser.mockResolvedValue(mockUser as any);

      const result = await controller.assignRole(assignDto);

      expect(rolesService.assignRoleToUser).toHaveBeenCalledWith(
        mockUserId,
        mockRoleId,
      );
      expect(result.message).toBe("Role assigned successfully");
    });
  });

  describe("removeRoleFromUser", () => {
    it("should remove role from user", async () => {
      const userWithoutRole = { ...mockUser, roleId: null };
      rolesService.removeRoleFromUser.mockResolvedValue(userWithoutRole as any);

      const result = await controller.removeRoleFromUser(mockUserId);

      expect(rolesService.removeRoleFromUser).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("Role removed from user successfully");
    });
  });
});
