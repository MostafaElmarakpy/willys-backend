import * as crypto from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { MailService } from "src/common/mail/mail.service";
import { ConfigService } from "src/config/config.service";
import { User } from "src/database/entities/user.entity";
import { UsersService } from "src/modules/users/users.service";
import { MoreThan, type Repository } from "typeorm";
import { AccessToken } from "../database/entities/access-token.entity";
import { ResetPasswordToken } from "../database/entities/reset-password-token.entity";
import { ChangeEmailDto } from "./dto/changeEmail.dto";
import { ChangePasswordDto } from "./dto/changePassword.dto";
import { ForgotPasswordDto } from "./dto/forgotPassword.dto";
import { LoginDto } from "./dto/login.dto";
import { ProfileDto } from "./dto/profile.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResendVerificationEmailDto } from "./dto/resendVerificationEmail.dto";
import { ResetPasswordDto } from "./dto/resetPassword.dto";
import { UpdateProfileDto } from "./dto/updateProfile.dto";
import { VerifyEmailDto } from "./dto/verifyEmail.dto";

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(ResetPasswordToken)
    readonly resetPasswordTokenRepository: Repository<ResetPasswordToken>,
    @InjectRepository(AccessToken)
    readonly accessTokenRepository: Repository<AccessToken>,
    private readonly userService: UsersService,
    private readonly mailService: MailService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = identifier.includes("@")
      ? await this.userService.findByEmail(identifier)
      : await this.userService.findByPhoneNumber(identifier);

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password: _password, ...result } = user;
      return result;
    }
    return null;
  }

  async generateAccessToken(user: any) {
    if (!("confirmAccount" in user) || !("status" in user)) {
      user = await this.userService.findOne(user.id);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }
    }

    // Calculate the expiration time
    const expirationDate = new Date(
      Date.now() +
        this.parseExpirationTime(
          this.configService.get("jwtAccessExpiration") as string,
        ) *
          1000,
    );

    // Calculate the expiration time
    const refreshExpirationDate = new Date(
      Date.now() +
        this.parseExpirationTime(
          this.configService.get("jwtRefreshExpiration") as string,
        ) *
          1000,
    );

    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      phoneNumberCountryCode: user.phoneNumberCountryCode,
      role: user.role,
      expirationDate,
      refreshExpirationDate,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.parseExpirationTime(
        this.configService.get("jwtRefreshExpiration") as string,
      ),
    });

    await this.saveAccessTokenToDb(
      user,
      accessToken,
      refreshToken,
      expirationDate,
      refreshExpirationDate,
    );

    await this.userService.updateLastLogin(user.id);

    return {
      user: new ProfileDto(user),
      token: {
        type: "Bearer",
        access_token: accessToken,
        access_token_expire: expirationDate.toISOString(),
        refresh_token: refreshToken,
        refresh_token_expire: refreshExpirationDate.toISOString(),
      },
    };
  }

  async saveAccessTokenToDb(
    user: any,
    accessToken: string,
    refreshToken: string,
    expirationDate: Date,
    refreshExpirationDate: Date,
  ) {
    const maxRetries = 3;
    const baseDelay = 100; // 100ms base delay

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check if repository manager has an active connection
        const dataSource = this.accessTokenRepository.manager.connection;
        if (!dataSource?.isInitialized) {
          throw new Error("DataSource is not initialized");
        }

        const accessTokenEntity = this.accessTokenRepository.create({
          refreshToken,
          accessToken,
          identifier: user.email || user.phoneNumber,
          userId: user.id,
          expiration: expirationDate,
          refreshExpiration: refreshExpirationDate,
        });

        await this.accessTokenRepository.save(accessTokenEntity);
        return; // Success, exit the retry loop
      } catch (error: any) {
        if (error.code === "23503") {
          console.error(
            `Failed to save access token for user ${user.id}: User may have been deleted`,
          );
          return; // Don't retry foreign key violations
        }

        // Check if it's a connection error
        const isConnectionError =
          error.message?.includes("Driver not Connected") ||
          error.message?.includes("Connection") ||
          error.name === "TypeORMError";

        if (isConnectionError && attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const delay = baseDelay * 2 ** (attempt - 1);
          console.warn(
            `Connection error saving access token (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Non-connection error or max retries reached
          console.error(
            `Failed to save access token for user ${user.id} after ${attempt} attempts:`,
            error.message,
          );
          throw error;
        }
      }
    }
  }

  async login(loginDto: LoginDto) {
    const { loginMethod, identifier, phoneNumberCountryCode, password } =
      loginDto;

    let user: User | null;
    if (loginMethod === "email" && identifier) {
      user = await this.userService.findByEmail(identifier);
    } else if (
      loginMethod === "phone" &&
      identifier &&
      phoneNumberCountryCode
    ) {
      user = await this.userService.findByPhoneNumberAndCountryCode(
        identifier,
        phoneNumberCountryCode,
      );
    } else {
      throw new BadRequestException("Invalid login method");
    }

    if (!user) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = (await this.generateAccessToken(user)).token;

    return { user: new ProfileDto(user), token };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);

      return await this.generateAccessToken(payload);
    } catch (_e) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async register(registerDto: RegisterDto, avatar: any): Promise<ProfileDto> {
    let existingUser: User | null | undefined;

    if (registerDto.registerMethod === "email") {
      existingUser = await this.userService.findByEmail(
        registerDto.email as string,
      );
      if (existingUser) {
        throw new ConflictException("Email already in use");
      }
    }

    if (registerDto.phoneNumber) {
      existingUser = await this.userService.findByPhoneNumber(
        registerDto.phoneNumber,
      );
      if (existingUser) {
        throw new ConflictException("Phone number already in use");
      }
    }

    if (!registerDto.registerMethod) {
      throw new BadRequestException("Invalid registration method");
    }

    const registeredUser = await this.userService.register(
      registerDto.registerMethod,
      registerDto,
      avatar,
    );

    return registeredUser;
  }

  async logout(_request: any) {
    // Implement your logout logic here
    // For example, you can invalidate the user's session or token
  }

  async profile(userId: string) {
    const user = await this.userService.findOne(userId);
    if (!user) throw new NotFoundException("User not found");
    return new ProfileDto(user);
  }

  async updateProfile(
    userId: string,
    updateProfile: UpdateProfileDto,
    avatar: any,
  ) {
    const user = await this.userService.updateProfile(
      userId,
      updateProfile,
      avatar,
    );

    return new ProfileDto(user);
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const token = crypto.randomBytes(20).toString("hex");

    const encryptedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const tokenValidity = new Date(Date.now() + 20 * 60 * 1000); // valid for 20 minutes

    const resetPasswordURL = `${forgotPasswordDto.callbackUrl}?reset-password&token=${token}`;

    await this.resetPasswordTokenRepository.save({
      email: user.email,
      resetToken: encryptedToken,
      expiresAt: tokenValidity,
    });

    /* 
    TODO: Implement email sending logic
    */

    await this.mailService.sendMail({
      to: user.email as string,
      subject: "Reset Your Password",
      html: `Here is the link to reset your password. The link is valid for 20 minutes: <a href="${resetPasswordURL}">${resetPasswordURL}</a>`,
    });

    return "Password reset instructions sent to your email";
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const encryptedToken = crypto
      .createHash("sha256")
      .update(resetPasswordDto.token)
      .digest("hex");

    const user = await this.resetPasswordTokenRepository.findOne({
      where: { resetToken: encryptedToken, expiresAt: MoreThan(new Date()) },
      relations: ["user"],
    });

    if (!user) {
      throw new BadRequestException("Invalid request or link expired");
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    await this.userService.updatePassword(user.email, hashedPassword);
    await this.resetPasswordTokenRepository.delete({
      resetToken: encryptedToken,
    });

    return "Password changed successfully";
  }

  async changeEmail(userId: string, _changeEmailDto: ChangeEmailDto) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // TODO: Implement email verification logic
    // You might want to send a verification email to the new email address

    // await this.userService.updateEmail(user.id, changeEmailDto.newEmail);
    return "Email changed successfully";
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userService.findOne(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    await this.userService.updatePassword(
      user.email as string,
      hashedNewPassword,
    );

    return "Password changed successfully";
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    try {
      const payload = this.jwtService.verify(verifyEmailDto.token);

      const user = await this.userService.findOne(payload.userId);

      if (!user) {
        throw new NotFoundException("User not found");
      }

      await this.userService.verifyUserEmail(user.email as string);
      return "Email verified successfully";
    } catch (_error) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  async resendVerificationEmail(
    resendVerificationEmailDto: ResendVerificationEmailDto,
  ) {
    const user = await this.userService.findByEmail(
      resendVerificationEmailDto.email,
    );

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.confirmAccount) {
      return "Email is already verified";
    }

    const verificationToken = this.jwtService.sign(
      { userId: user.id },
      { expiresIn: "1d" },
    );

    const verificationEmailURL = `${resendVerificationEmailDto.callbackUrl}?verify-email&token=${verificationToken}`;

    // Send email asynchronously
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

    return "Verification email resent successfully";
  }

  async deleteAccount(userId: string) {
    const user = await this.userService.findOne(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    // TODO: Implement any necessary cleanup logic
    // For example, you might want to delete associated data, revoke tokens, etc.

    // await this.userService.deleteUser(user.id);
    return "Account deleted successfully";
  }

  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  // Helper method to parse expiration time
  private parseExpirationTime(expiration: string | number): number {
    if (typeof expiration === "number") {
      return expiration;
    }
    const match = expiration.match(/(\d+)([smhd])/);
    if (!match) {
      return 3600; // Default to 1 hour if parsing fails
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      case "d":
        return value * 86400;
      default:
        return 3600;
    }
  }
}
