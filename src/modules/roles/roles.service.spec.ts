import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { PermissionAction } from "../../common/enums/PermissionAction";
import { PermissionModule } from "../../common/enums/PermissionModule";
import { Role } from "../../database/entities/role.entity";
import { User } from "../../database/entities/user.entity";
import { RolesService } from "./roles.service";

// Mock uuid validate
jest.mock("uuid", () => ({
  validate: jest.fn((id) => {
    // Simple UUID format check for testing
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id,
    );
  }),
}));

describe("RolesService", () => {
  let service: RolesService;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockRole: Partial<Role> = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "admin",
    displayName: "Administrator",
    description: "System administrator role",
    permissions: {
      [PermissionModule.USERS]: [
        PermissionAction.READ,
        PermissionAction.CREATE,
      ],
    },
    isSystemRole: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSystemRole: Partial<Role> = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "super_admin",
    displayName: "Super Administrator",
    isSystemRole: true,
    isActive: true,
  };

  const mockUser: Partial<User> = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    email: "test@example.com",
    adminRoleId: mockRole.id,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getRepositoryToken(Role),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            softDelete: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleRepository = module.get(getRepositoryToken(Role));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated roles with default values", async () => {
      const roles = [mockRole as Role];
      roleRepository.findAndCount.mockResolvedValue([roles, 1]);

      const result = await service.findAll();

      expect(result).toEqual({
        roles,
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(roleRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: "DESC" },
      });
    });

    it("should apply custom pagination", async () => {
      roleRepository.findAndCount.mockResolvedValue([[], 50]);

      const result = await service.findAll(2, 20);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(3);
      expect(roleRepository.findAndCount).toHaveBeenCalledWith({
        skip: 20,
        take: 20,
        order: { createdAt: "DESC" },
      });
    });

    it("should apply valid sortBy field", async () => {
      roleRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, "name", "ASC");

      expect(roleRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { name: "ASC" },
      });
    });

    it("should fallback to createdAt for invalid sortBy field", async () => {
      roleRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, "invalidField", "ASC");

      expect(roleRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: "ASC" },
      });
    });
  });

  describe("findOne", () => {
    it("should return role when found", async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);

      const result = await service.findOne(mockRole.id!);

      expect(result).toEqual(mockRole);
    });

    it("should throw BadRequestException for invalid UUID", async () => {
      await expect(service.findOne("invalid-id")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when role not found", async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne("550e8400-e29b-41d4-a716-446655440000"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByName", () => {
    it("should return role by name", async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);

      const result = await service.findByName("admin");

      expect(result).toEqual(mockRole);
      expect(roleRepository.findOne).toHaveBeenCalledWith({
        where: { name: "admin" },
      });
    });

    it("should return null when role not found", async () => {
      roleRepository.findOne.mockResolvedValue(null);

      const result = await service.findByName("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    const createDto = {
      name: "new_role",
      displayName: "New Role",
      description: "A new custom role",
      permissions: { [PermissionModule.USERS]: [PermissionAction.READ] },
    };

    it("should create a new role", async () => {
      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.create.mockReturnValue(mockRole as Role);
      roleRepository.save.mockResolvedValue(mockRole as Role);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(roleRepository.create).toHaveBeenCalledWith({
        ...createDto,
        isSystemRole: false,
      });
    });

    it("should throw BadRequestException if role name exists", async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("update", () => {
    const updateDto = {
      displayName: "Updated Role",
      description: "Updated description",
    };

    it("should update role successfully", async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);
      roleRepository.save.mockResolvedValue({
        ...mockRole,
        ...updateDto,
      } as Role);

      const result = await service.update(mockRole.id!, updateDto);

      expect(result.displayName).toBe(updateDto.displayName);
    });

    it("should throw BadRequestException when changing system role name", async () => {
      roleRepository.findOne.mockResolvedValue(mockSystemRole as Role);

      await expect(
        service.update(mockSystemRole.id!, { name: "new_name" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when role not found", async () => {
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update("550e8400-e29b-41d4-a716-446655440000", updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("should soft delete role", async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);
      userRepository.count.mockResolvedValue(0);
      roleRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockRole.id!);

      expect(roleRepository.softDelete).toHaveBeenCalledWith(mockRole.id);
    });

    it("should throw BadRequestException for system role", async () => {
      roleRepository.findOne.mockResolvedValue(mockSystemRole as Role);

      await expect(service.remove(mockSystemRole.id!)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException if users are assigned", async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);
      userRepository.count.mockResolvedValue(5);

      await expect(service.remove(mockRole.id!)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("assignRoleToUser", () => {
    it("should assign role to user", async () => {
      const user = { ...mockUser, adminRoleId: undefined } as User;
      userRepository.findOne.mockResolvedValue(user);
      roleRepository.findOne.mockResolvedValue(mockRole as Role);
      userRepository.save.mockResolvedValue({
        ...user,
        adminRoleId: mockRole.id,
      } as User);

      const result = await service.assignRoleToUser(user.id!, mockRole.id!);

      expect(result.adminRoleId).toBe(mockRole.id);
    });

    it("should throw BadRequestException for invalid user ID", async () => {
      await expect(
        service.assignRoleToUser("invalid", mockRole.id!),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user not found", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignRoleToUser(
          "550e8400-e29b-41d4-a716-446655440000",
          mockRole.id!,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for inactive role", async () => {
      const inactiveRole = { ...mockRole, isActive: false } as Role;
      userRepository.findOne.mockResolvedValue(mockUser as User);
      roleRepository.findOne.mockResolvedValue(inactiveRole);

      await expect(
        service.assignRoleToUser(mockUser.id!, inactiveRole.id!),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("removeRoleFromUser", () => {
    it("should remove role from user", async () => {
      const user = { ...mockUser } as User;
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({
        ...user,
        adminRoleId: undefined,
      } as User);

      const result = await service.removeRoleFromUser(user.id!);

      expect(result.adminRoleId).toBeUndefined();
    });

    it("should throw BadRequestException for invalid user ID", async () => {
      await expect(service.removeRoleFromUser("invalid")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when user not found", async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeRoleFromUser("550e8400-e29b-41d4-a716-446655440000"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAvailablePermissions", () => {
    it("should return MODULE_PERMISSIONS", () => {
      const result = service.getAvailablePermissions();

      expect(result).toBeDefined();
    });
  });

  describe("seedPredefinedRoles", () => {
    it("should create predefined roles that do not exist", async () => {
      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.create.mockReturnValue(mockRole as Role);
      roleRepository.save.mockResolvedValue(mockRole as Role);

      await service.seedPredefinedRoles();

      expect(roleRepository.create).toHaveBeenCalled();
      expect(roleRepository.save).toHaveBeenCalled();
    });

    it("should skip existing roles", async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as Role);

      await service.seedPredefinedRoles();

      expect(roleRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("getUsersCountByRole", () => {
    it("should return count of users with role", async () => {
      userRepository.count.mockResolvedValue(10);

      const result = await service.getUsersCountByRole(mockRole.id!);

      expect(result).toBe(10);
      expect(userRepository.count).toHaveBeenCalledWith({
        where: { adminRoleId: mockRole.id },
      });
    });
  });
});
