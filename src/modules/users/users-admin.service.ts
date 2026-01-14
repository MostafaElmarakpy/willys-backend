import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { UserProvider } from "src/common/enums/UserProvider";
import { UserRole } from "src/common/enums/UserRole";
import { User } from "src/database/entities/user.entity";
import { UploadMediaService } from "src/services/upload-media/upload-media.service";
import { Repository } from "typeorm";
import { validate as uuidValidate } from "uuid";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Injectable()
export class UsersAdminService {
  constructor(
    @InjectRepository(User) readonly usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly uploadMediaService: UploadMediaService,
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
      throw new ConflictException("Email or Phone already exists");
    }

    const user = new User();
    user.email = createUserDto?.email;
    user.password = await bcrypt.hash(createUserDto.password, 10);
    user.role = createUserDto.role as UserRole;
    user.status = createUserDto.status;
    user.fullName = createUserDto.fullName;
    user.phoneNumber = createUserDto?.phoneNumber;
    user.phoneNumberCountryCode = createUserDto.phoneNumberCountryCode;
    user.adminRoleId = createUserDto.adminRoleId;

    const uploadedAvatar = await this.uploadMediaService.saveOneFile(
      avatar,
      "users",
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
      throw new BadRequestException("Invalid ID format find user");
    }

    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const allowedSortFields = [
      "id",
      "email",
      "fullName",
      "phoneNumber",
      "phoneNumberCountryCode",
      "createdAt",
      "updatedAt",
    ];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [users, total] = await this.usersRepository.findAndCount({
      where: {
        role: UserRole.user,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        phoneNumberCountryCode: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      order: { [orderField]: sortOrder },
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  async findAllUsersRole(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const allowedSortFields = [
      "id",
      "email",
      "fullName",
      "phoneNumber",
      "phoneNumberCountryCode",
      "role",
      "createdAt",
      "updatedAt",
    ];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

    const [users, total] = await this.usersRepository.findAndCount({
      where: {
        role: UserRole.admin,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        phoneNumberCountryCode: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      order: { [orderField]: sortOrder },
    });

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto, avatar: any) {
    if (!uuidValidate(id)) {
      throw new BadRequestException("Invalid ID format update user");
    }
    const user = await this.findOne(id);

    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);

    const uploadedAvatar = await this.uploadMediaService.saveOneFile(
      avatar,
      "users",
      user.id,
    );

    const updatedUserData = {
      ...updateUserDto,
      avatar: uploadedAvatar?.url ?? user.avatar,
      role: updateUserDto.role ? (updateUserDto.role as UserRole) : user.role,
    };

    await this.usersRepository.update(id, updatedUserData);
    return this.findOne(id);
  }
  async remove(id: string) {
    if (!uuidValidate(id)) {
      throw new BadRequestException("Invalid ID format delete user");
    }
    const user = await this.findOne(id);

    if (!user) throw new NotFoundException(`User with ID "${id}" not found`);

    return this.usersRepository.softDelete(id);
  }
}
