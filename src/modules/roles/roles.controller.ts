import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permission } from 'src/common/decorators/permissions.decorator';
import { PermissionModule } from 'src/common/enums/PermissionModule';
import { PermissionAction } from 'src/common/enums/PermissionAction';
import {
  createSuccessResponse,
  createCreatedResponse,
} from 'src/common/utils/api-response-wrapper';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Version('1')
  @Permission(PermissionModule.ROLES, PermissionAction.READ)
  async findAll(@Query() pagination: PaginationDto) {
    const result = await this.rolesService.findAll(
      pagination.page || 1,
      pagination.limit || 10,
      pagination.sortBy,
      pagination.sortOrder || 'DESC',
    );
    return createSuccessResponse(result, 'Roles retrieved successfully');
  }

  @Get('permissions')
  @Version('1')
  @Permission(PermissionModule.ROLES, PermissionAction.READ)
  async getAvailablePermissions() {
    const permissions = this.rolesService.getAvailablePermissions();
    return createSuccessResponse(
      permissions,
      'Available permissions retrieved successfully',
    );
  }

  @Get(':id')
  @Version('1')
  @Permission(PermissionModule.ROLES, PermissionAction.READ)
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    const usersCount = await this.rolesService.getUsersCountByRole(id);
    return createSuccessResponse(
      { ...role, usersCount },
      'Role retrieved successfully',
    );
  }

  @Post()
  @Version('1')
  @Permission(PermissionModule.ROLES, PermissionAction.CREATE)
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.rolesService.create(createRoleDto);
    return createCreatedResponse(role, 'Role created successfully');
  }

  @Patch(':id')
  @Version('1')
  @Permission(PermissionModule.ROLES, PermissionAction.UPDATE)
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.rolesService.update(id, updateRoleDto);
    return createSuccessResponse(role, 'Role updated successfully');
  }

  @Delete(':id')
  @Version('1')
  @Permission(PermissionModule.ROLES, PermissionAction.DELETE)
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
    return createSuccessResponse(null, 'Role deleted successfully');
  }

  @Post('assign')
  @Version('1')
  @Permission(PermissionModule.ROLES, PermissionAction.ASSIGN)
  async assignRole(@Body() assignRoleDto: AssignRoleDto) {
    const user = await this.rolesService.assignRoleToUser(
      assignRoleDto.userId,
      assignRoleDto.roleId,
    );
    return createSuccessResponse(user, 'Role assigned successfully');
  }

  @Delete('user/:userId')
  @Version('1')
  @Permission(PermissionModule.ROLES, PermissionAction.ASSIGN)
  async removeRoleFromUser(@Param('userId') userId: string) {
    const user = await this.rolesService.removeRoleFromUser(userId);
    return createSuccessResponse(user, 'Role removed from user successfully');
  }
}
