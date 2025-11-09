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
import { PaginationOptionsDto } from 'src/common/pagination/dto';
import {
  paginate,
  showOne,
  success,
} from 'src/common/utils/api-response-wrapper';
import { EntityFileInterceptor } from 'src/services/upload-media/entity-file.interceptor';
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
  async findAll(@Query() pagination: PaginationOptionsDto) {
    const { data, total, pageNumber, limitNumber } =
      await this.usersService.findAll(pagination);
    return paginate(data, total, pageNumber, limitNumber);
  }

  @Get('/management')
  @Version('1')
  @Roles(UserRole.admin)
  async findAllUsersRole(@Query() pagination: PaginationOptionsDto) {
    const { data, total, pageNumber, limitNumber } =
      await this.usersService.findAllUsersRole(pagination);
    return paginate(data, total, pageNumber, limitNumber);
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
    return showOne(user);
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  @Serialize(UserDto)
  async findOne(@Param('id') id: string) {
    const response = await this.usersService.findOne(id);
    const result = showOne(response);
    return result.data;
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
    const response = await this.usersService.update(
      updateUserDto.id,
      updateUserDto,
      avatar,
    );

    return showOne(response);
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return success([]);
  }
}
