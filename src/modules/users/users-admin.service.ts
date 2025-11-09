import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserProvider } from 'src/common/enums/UserProvider';
import { UserRole } from 'src/common/enums/UserRole';
import { PaginationService } from 'src/common/pagination';
import { PaginationOptionsDto } from 'src/common/pagination/dto';
import { User } from 'src/database/entities/user.entity';
import { UploadMediaService } from 'src/services/upload-media/upload-media.service';
import { Repository } from 'typeorm';
import { validate as uuidValidate } from 'uuid';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Injectable()
export class UsersAdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly uploadMediaService: UploadMediaService,
    private readonly paginationService: PaginationService,
  ) {}

  async create(createUserDto: CreateUserDto, avatar: any): Promise<User> {
    let userByEmail: User | null = null;
    let userByPhoneNumber: User | null = null;

    if (createUserDto?.email) {
      userByEmail = await this.findByEmail(createUserDto.email as string);
    }
    if (createUserDto?.phoneNumber) {
      userByPhoneNumber =
        await this.usersService.findByPhoneNumberAndCountryCode(
          createUserDto.phoneNumber as string,
          createUserDto.phoneNumberCountryCode as string,
        );
    }

    if (userByEmail || userByPhoneNumber) {
      throw new ConflictException('Email or Phone already exists');
    }

    const user = new User();
    user.email = createUserDto?.email;
    user.password = await bcrypt.hash(createUserDto.password, 10);
    user.role = createUserDto.role;
    user.status = createUserDto.status;
    user.fullName = createUserDto.fullName;
    user.phoneNumber = createUserDto?.phoneNumber;
    user.phoneNumberCountryCode = createUserDto.phoneNumberCountryCode;

    const uploadedAvatar = await this.uploadMediaService.saveOneFile(
      avatar,
      'users',
      user.id,
    );
    user.avatar = uploadedAvatar?.url;

    user.birthday = new Date();
    user.joined = new Date();
    user.gender = createUserDto.gender;
    user.provider = UserProvider.System;
    user.confirmAccount = false;
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.lastLogin = new Date();
    user.lastLogout = new Date();
    user.verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    user.userLocale = createUserDto.userLocale;
    const newUser = await this.usersRepository.save(user);

    return newUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .findOne({ where: { email } })
      .then((user: any) => {
        return user ?? null;
      });
  }

  async findOne(id: string) {
    if (!uuidValidate(id)) {
      throw new BadRequestException('Invalid ID format find user');
    }

    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(pagination: PaginationOptionsDto): Promise<{
    data: User[];
    total: number;
    pageNumber: number;
    limitNumber: number;
  }> {
    const fetchUsers = async (paginationOptions: PaginationOptionsDto) => {
      return this.paginationService.findWithPagination(
        this.usersRepository,
        {
          ...paginationOptions,
          simple: true,
          simpleSelectFields: [
            'entity.id',
            'entity.email',
            'entity.fullName',
            'entity.phoneNumber',
            'entity.phoneNumberCountryCode',
          ],
        },
        [],
        (queryBuilder) =>
          queryBuilder.andWhere('entity.role != :role', {
            role: UserRole.admin,
          }),
      );
    };

    let result = await fetchUsers(pagination);
    return result;
  }
  async findAllUsersRole(pagination: PaginationOptionsDto): Promise<{
    data: User[];
    total: number;
    pageNumber: number;
    limitNumber: number;
  }> {
    const fetchUsers = async (paginationOptions: PaginationOptionsDto) => {
      return this.paginationService.findWithPagination(
        this.usersRepository,
        {
          ...paginationOptions,
          simple: true,
          simpleSelectFields: [
            'entity.id',
            'entity.email',
            'entity.fullName',
            'entity.phoneNumber',
            'entity.phoneNumberCountryCode',
            'entity.role',
          ],
        },
        [],
        (queryBuilder) =>
          queryBuilder.andWhere('entity.role != :role', {
            role: UserRole.user,
          }),
      );
    };

    let result = await fetchUsers(pagination);
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto, avatar: any) {
    if (!uuidValidate(id)) {
      throw new BadRequestException('Invalid ID format update user');
    }
    const user = await this.findOne(id);

    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);

    const uploadedAvatar = await this.uploadMediaService.saveOneFile(
      avatar,
      'users',
      user.id,
    );

    const updatedUserData = {
      ...updateUserDto,
      avatar: uploadedAvatar?.url ?? user.avatar,
    };

    await this.usersRepository.update(id, updatedUserData);
    return this.findOne(id);
  }
  async remove(id: string) {
    if (!uuidValidate(id)) {
      throw new BadRequestException('Invalid ID format delete user');
    }
    const user = await this.findOne(id);

    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);

    return this.usersRepository.softDelete(id);
  }
}
