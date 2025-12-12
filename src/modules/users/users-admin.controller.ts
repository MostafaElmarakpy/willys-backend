import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/UserRole';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import {
  AddParamToBodyInterceptor,
  TransformToTypeTypes,
} from 'src/common/interceptor/add-param-to-body-interceptor';
import { Serialize } from 'src/common/interceptor/serialize-interceptor';
import { EntityFileInterceptor } from 'src/services/upload-media/entity-file.interceptor';
import {
  createSuccessResponse,
  createCreatedResponse,
} from 'src/common/utils/api-response-wrapper';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UsersAdminService } from './users-admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/users')
export class UsersAdminController {
  constructor(private readonly usersService: UsersAdminService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAll(@Query() pagination: PaginationDto) {
    const users = await this.usersService.findAll(
      pagination.page || 1,
      pagination.limit || 10,
    );
    return createSuccessResponse(users, 'Users retrieved successfully');
  }

  @Get('/management')
  @Version('1')
  @Roles(UserRole.admin)
  async findAllUsersRole(@Query() pagination: PaginationDto) {
    const users = await this.usersService.findAllUsersRole(
      pagination.page || 1,
      pagination.limit || 10,
    );
    return createSuccessResponse(
      users,
      'Management users retrieved successfully',
    );
  }

  @UseInterceptors(EntityFileInterceptor('user', 'avatar'))
  @Post()
  @Version('1')
  @Roles(UserRole.admin)
  async create(
    @UploadedFile() avatar: Express.Multer.File,
    @Body() createUserDto: CreateUserDto,
  ) {
    const user = await this.usersService.create(createUserDto, avatar);
    return createCreatedResponse(user, 'User created successfully');
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  @Serialize(UserDto)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return createSuccessResponse(user, 'User retrieved successfully');
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.admin)
  @UseInterceptors(
    new AddParamToBodyInterceptor({
      paramName: 'id',
      transformTo: TransformToTypeTypes.string,
    }),
  )
  @UseInterceptors(EntityFileInterceptor('user', 'avatar'))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    const user = await this.usersService.update(
      updateUserDto.id,
      updateUserDto,
      avatar,
    );

    return createSuccessResponse(user, 'User updated successfully');
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return createSuccessResponse(null, 'User deleted successfully');
  }
}
