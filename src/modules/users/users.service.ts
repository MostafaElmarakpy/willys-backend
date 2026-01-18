import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { ProfileDto } from "src/authentication/dto/profile.dto";
import { RegisterDto } from "src/authentication/dto/register.dto";
import { UpdateProfileDto } from "src/authentication/dto/updateProfile.dto";
import { UserProvider } from "src/common/enums/UserProvider";
import { UserRole } from "src/common/enums/UserRole";
import { UserStatus } from "src/common/enums/UserStatus";
import { MailService } from "src/common/mail/mail.service";
import { User } from "src/database/entities/user.entity";
import { UploadMediaService } from "src/services/upload-media/upload-media.service";
import { Repository } from "typeorm";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) readonly usersRepository: Repository<User>,
    private readonly uploadMediaService: UploadMediaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(
    registerMethod: string,
    registerDto: RegisterDto,
    avatar: any,
  ): Promise<ProfileDto> {
    let existingUser: User | null = null;

    if (registerMethod === "email") {
      existingUser = await this.findByEmail(registerDto.email as string);
    }
    if (registerMethod === "phoneNumber") {
      existingUser = await this.findByPhoneNumberAndCountryCode(
        registerDto.phoneNumber as string,
        registerDto.phoneNumberCountryCode as string,
      );
    }

    if (existingUser) {
      throw new ConflictException("Email or Phone already exists");
    }

    const user = new User();
    user.email = registerDto?.email?.trim();
    user.password = await bcrypt.hash(registerDto.password, 10);
    user.role = UserRole.user;
    user.status = UserStatus.Online;
    user.fullName = registerDto.fullName;
    user.phoneNumber = registerDto?.phoneNumber?.trim();
    user.phoneNumberCountryCode = registerDto.phoneNumberCountryCode;

    const uploadedAvatar = await this.uploadMediaService.saveOneFile(
      avatar,
      "users",
      user.id,
    );
    user.avatar = uploadedAvatar?.url;

    user.birthday = new Date();
    user.joined = new Date();
    user.gender = registerDto.gender;
    user.provider = UserProvider.System;
    user.confirmAccount = false;
    user.createdAt = new Date();
    user.updatedAt = new Date();
    user.lastLogin = new Date();
    user.lastLogout = new Date();
    user.verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    user.userLocale = registerDto.userLocale;
    const newUser = await this.usersRepository.save(user);

    const verificationToken = this.jwtService.sign(
      { userId: user.id },
      { expiresIn: "1d" },
    );

    if (user?.email) {
      const verificationEmailURL = `${registerDto.callbackUrl}?verify-email&token=${verificationToken}`;

      // Send email asynchronously without blocking registration
      this.mailService
        .sendMail({
          to: user.email as string,
          subject: "Request Verification Your Email",
          html: `Here is the link to verify your email. The link is valid for 20 minutes: <a href="${verificationEmailURL}">${verificationEmailURL}</a>`,
        })
        .catch((error) => {
          console.warn(
            `Failed to send verification email to ${user.email}:`,
            error.message,
          );
        });
    }

    return new ProfileDto(newUser);
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user || user.password !== password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  async validateUserToken(token: string): Promise<User> {
    const decoded = this.jwtService.verify(token);

    return await this.usersRepository
      .findOne({
        where: { email: decoded.email },
      })
      .then((user: any) => {
        return user ?? null;
      });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create({
      ...createUserDto,
      role: createUserDto.role as UserRole,
    });
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .findOne({ where: { email } })
      .then((user: any) => {
        return user ?? null;
      });
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.usersRepository
      .findOne({ where: { phoneNumber } })
      .then((user: any) => {
        return user ?? null;
      });
  }

  async findByPhoneNumberAndCountryCode(
    phoneNumber: string,
    countryCode: string,
  ): Promise<User | null> {
    return this.usersRepository
      .findOne({
        where: {
          phoneNumber,
          phoneNumberCountryCode: countryCode,
        },
      })
      .then((user: any) => {
        return user ?? null;
      });
  }

  async findOne(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { id },
      relations: ["adminRole"],
    });
  }

  async updateLastLogin(id: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    user.lastLogin = new Date();
    return await this.usersRepository.save(user);
  }

  async updatePassword(email: string, newPassword: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    user.password = newPassword;

    return await this.usersRepository.save(user);
  }

  async verifyUserEmail(email: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.confirmAccount = true;
    return await this.usersRepository.save(user);
  }

  async profile(userId: string) {
    const user = await this.findOne(userId);
    if (!user) throw new NotFoundException("User not found");
    return new ProfileDto(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException("User not found");

    const uploadedAvatar = file
      ? await this.uploadMediaService.saveOneFile(file, "users", user.id)
      : null;

    await this.usersRepository.update(userId, {
      ...updateProfileDto,
      avatar: uploadedAvatar?.url || user.avatar,
    });

    const newUserInfo = await this.usersRepository.findOne({
      where: { id: userId },
    });

    return new ProfileDto(newUserInfo);
  }
}
