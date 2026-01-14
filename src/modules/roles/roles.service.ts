import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { MODULE_PERMISSIONS } from "src/common/types/permission.types";
import { Role } from "src/database/entities/role.entity";
import { User } from "src/database/entities/user.entity";
import { Repository } from "typeorm";
import { validate as uuidValidate } from "uuid";
import { PREDEFINED_ROLES } from "./constants/predefined-roles";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) readonly roleRepository: Repository<Role>,
    @InjectRepository(User) readonly userRepository: Repository<User>,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{
    roles: Role[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const allowedSortFields = [
      "id",
      "name",
      "displayName",
      "isSystemRole",
      "isActive",
      "createdAt",
      "updatedAt",
    ];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [roles, total] = await this.roleRepository.findAndCount({
      skip,
      take: limit,
      order: { [orderField]: sortOrder },
    });

    return {
      roles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Role> {
    if (!uuidValidate(id)) {
      throw new BadRequestException("Invalid ID format");
    }

    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException("Role not found");
    }
    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.findByName(createRoleDto.name);
    if (existingRole) {
      throw new BadRequestException("Role with this name already exists");
    }

    const role = this.roleRepository.create({
      ...createRoleDto,
      isSystemRole: false,
    });

    return this.roleRepository.save(role);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (
      role.isSystemRole &&
      updateRoleDto.name &&
      updateRoleDto.name !== role.name
    ) {
      throw new BadRequestException("Cannot change name of system role");
    }

    Object.assign(role, updateRoleDto);
    return this.roleRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystemRole) {
      throw new BadRequestException("Cannot delete system role");
    }

    const usersWithRole = await this.userRepository.count({
      where: { adminRoleId: id },
    });

    if (usersWithRole > 0) {
      throw new BadRequestException(
        `Cannot delete role. ${usersWithRole} users are assigned to this role.`,
      );
    }

    await this.roleRepository.softDelete(id);
  }

  async assignRoleToUser(userId: string, roleId: string): Promise<User> {
    if (!uuidValidate(userId)) {
      throw new BadRequestException("Invalid user ID format");
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const role = await this.findOne(roleId);
    if (!role.isActive) {
      throw new BadRequestException("Cannot assign inactive role");
    }

    user.adminRoleId = roleId;
    return this.userRepository.save(user);
  }

  async removeRoleFromUser(userId: string): Promise<User> {
    if (!uuidValidate(userId)) {
      throw new BadRequestException("Invalid user ID format");
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.adminRoleId = undefined;
    return this.userRepository.save(user);
  }

  getAvailablePermissions() {
    return MODULE_PERMISSIONS;
  }

  async seedPredefinedRoles(): Promise<void> {
    for (const roleData of PREDEFINED_ROLES) {
      const existingRole = await this.findByName(roleData.name);
      if (!existingRole) {
        const role = this.roleRepository.create({
          ...roleData,
          isSystemRole: true,
        });
        await this.roleRepository.save(role);
      }
    }
  }

  async getUsersCountByRole(roleId: string): Promise<number> {
    return this.userRepository.count({
      where: { adminRoleId: roleId },
    });
  }
}
