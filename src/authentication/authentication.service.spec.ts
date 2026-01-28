import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { UserGender } from "../common/enums/UserGender";
import { UserProvider } from "../common/enums/UserProvider";
import { UserRole } from "../common/enums/UserRole";
import { UserStatus } from "../common/enums/UserStatus";
import { MailService } from "../common/mail/mail.service";
import { ConfigService } from "../config/config.service";
import { AccessToken } from "../database/entities/access-token.entity";
import { ResetPasswordToken } from "../database/entities/reset-password-token.entity";
import type { User } from "../database/entities/user.entity";
import { UsersService } from "../modules/users/users.service";
import { AuthenticationService } from "./authentication.service";
import { ProfileDto } from "./dto/profile.dto";

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

const bcrypt = require("bcrypt");

describe("AuthenticationService", () => {
  let service: AuthenticationService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let mailService: jest.Mocked<MailService>;
  let configService: jest.Mocked<ConfigService>;
  let resetPasswordTokenRepository: jest.Mocked<Repository<ResetPasswordToken>>;
  let accessTokenRepository: jest.Mocked<Repository<AccessToken>>;

  const mockUserId = "user-123";

  const mockUser: Partial<User> = {
    id: mockUserId,
    email: "test@example.com",
    password: "hashed-password",
    fullName: "Test User",
    phoneNumber: "1234567890",
    phoneNumberCountryCode: "EG",
    role: UserRole.user,
    status: UserStatus.Online,
    provider: UserProvider.System,
    confirmAccount: true,
    avatar: "https://example.com/avatar.jpg",
    birthday: new Date("1990-01-01"),
    joined: new Date(),
    gender: UserGender.Male,
    userLocale: "ar",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    lastLogout: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: getRepositoryToken(ResetPasswordToken),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AccessToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByPhoneNumber: jest.fn(),
            findByPhoneNumberAndCountryCode: jest.fn(),
            findOne: jest.fn(),
            register: jest.fn(),
            updateLastLogin: jest.fn(),
            updatePassword: jest.fn(),
            updateProfile: jest.fn(),
            verifyUserEmail: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
    configService = module.get(ConfigService);
    resetPasswordTokenRepository = module.get(
      getRepositoryToken(ResetPasswordToken),
    );
    accessTokenRepository = module.get(getRepositoryToken(AccessToken));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validateUser", () => {
    it("should return user without password if credentials are valid (email)", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.validateUser(
        "test@example.com",
        "password123",
      );

      expect(result).toBeDefined();
      expect(result.email).toBe("test@example.com");
      expect(result.password).toBeUndefined();
      expect(usersService.findByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("should return user without password if credentials are valid (phone)", async () => {
      usersService.findByPhoneNumber.mockResolvedValue(mockUser as User);
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.validateUser("1234567890", "password123");

      expect(result).toBeDefined();
      expect(result.phoneNumber).toBe("1234567890");
      expect(result.password).toBeUndefined();
      expect(usersService.findByPhoneNumber).toHaveBeenCalledWith("1234567890");
    });

    it("should return null if user not found", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        "nonexistent@example.com",
        "password",
      );

      expect(result).toBeNull();
    });

    it("should return null if password is incorrect", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      bcrypt.compare.mockResolvedValue(false);

      const result = await service.validateUser(
        "test@example.com",
        "wrong-password",
      );

      expect(result).toBeNull();
    });
  });

  describe("generateAccessToken", () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === "jwtAccessExpiration") return "1h";
        if (key === "jwtRefreshExpiration") return "7d";
        return "";
      });
      jwtService.sign.mockReturnValue("mock-token");
      accessTokenRepository.create.mockReturnValue({} as AccessToken);
      accessTokenRepository.save.mockResolvedValue({} as AccessToken);
      usersService.updateLastLogin.mockResolvedValue(mockUser as User);
    });

    it("should generate access and refresh tokens for user with full data", async () => {
      const result = await service.generateAccessToken(mockUser);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.token.access_token).toBe("mock-token");
      expect(result.token.refresh_token).toBe("mock-token");
      expect(result.token.type).toBe("Bearer");
      expect(result.user).toBeInstanceOf(ProfileDto);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it("should fetch user if confirmAccount or status is missing", async () => {
      const partialUser = { id: mockUserId };
      usersService.findOne.mockResolvedValue(mockUser as User);

      const result = await service.generateAccessToken(partialUser);

      expect(usersService.findOne).toHaveBeenCalledWith(mockUserId);
      expect(result.user).toBeInstanceOf(ProfileDto);
    });

    it("should throw UnauthorizedException if user not found when fetching", async () => {
      const partialUser = { id: "nonexistent-id" };
      usersService.findOne.mockResolvedValue(null);

      await expect(service.generateAccessToken(partialUser)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should call updateLastLogin after generating tokens", async () => {
      await service.generateAccessToken(mockUser);

      expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUserId);
    });

    it("should save access token to database", async () => {
      await service.generateAccessToken(mockUser);

      expect(accessTokenRepository.create).toHaveBeenCalled();
      expect(accessTokenRepository.save).toHaveBeenCalled();
    });
  });

  describe("saveAccessTokenToDb", () => {
    it("should save access token successfully", async () => {
      accessTokenRepository.create.mockReturnValue({} as AccessToken);
      accessTokenRepository.save.mockResolvedValue({} as AccessToken);

      await service.saveAccessTokenToDb(
        mockUser,
        "access-token",
        "refresh-token",
        new Date(),
        new Date(),
      );

      expect(accessTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: "access-token",
          refreshToken: "refresh-token",
          userId: mockUserId,
        }),
      );
      expect(accessTokenRepository.save).toHaveBeenCalled();
    });

    it("should handle FK constraint error (23503) gracefully", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      accessTokenRepository.create.mockReturnValue({} as AccessToken);
      accessTokenRepository.save.mockRejectedValue({ code: "23503" });

      await expect(
        service.saveAccessTokenToDb(
          mockUser,
          "access-token",
          "refresh-token",
          new Date(),
          new Date(),
        ),
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should rethrow other errors", async () => {
      accessTokenRepository.create.mockReturnValue({} as AccessToken);
      accessTokenRepository.save.mockRejectedValue(new Error("Database error"));

      await expect(
        service.saveAccessTokenToDb(
          mockUser,
          "access-token",
          "refresh-token",
          new Date(),
          new Date(),
        ),
      ).rejects.toThrow("Database error");
    });
  });

  describe("login", () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === "jwtAccessExpiration") return "1h";
        if (key === "jwtRefreshExpiration") return "7d";
        return "";
      });
      jwtService.sign.mockReturnValue("mock-token");
      accessTokenRepository.create.mockReturnValue({} as AccessToken);
      accessTokenRepository.save.mockResolvedValue({} as AccessToken);
      usersService.updateLastLogin.mockResolvedValue(mockUser as User);
    });

    it("should login successfully with email", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.login({
        loginMethod: "email",
        identifier: "test@example.com",
        phoneNumberCountryCode: "EG" as any,
        password: "password123",
      });

      expect(result).toBeDefined();
      expect(result.user).toBeInstanceOf(ProfileDto);
      expect(result.token).toBeDefined();
      expect(usersService.findByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("should login successfully with phone", async () => {
      usersService.findByPhoneNumberAndCountryCode.mockResolvedValue(
        mockUser as User,
      );
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.login({
        loginMethod: "phone",
        identifier: "1234567890",
        phoneNumberCountryCode: "EG" as any,
        password: "password123",
      });

      expect(result).toBeDefined();
      expect(result.user).toBeInstanceOf(ProfileDto);
      expect(usersService.findByPhoneNumberAndCountryCode).toHaveBeenCalledWith(
        "1234567890",
        "EG",
      );
    });

    it("should throw BadRequestException for invalid login method", async () => {
      await expect(
        service.login({
          loginMethod: "invalid" as any,
          identifier: "test",
          phoneNumberCountryCode: "EG" as any,
          password: "password",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw UnauthorizedException if user not found", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          loginMethod: "email",
          identifier: "nonexistent@example.com",
          phoneNumberCountryCode: "EG" as any,
          password: "password",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException if password is invalid", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.login({
          loginMethod: "email",
          identifier: "test@example.com",
          phoneNumberCountryCode: "EG" as any,
          password: "wrong-password",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        if (key === "jwtAccessExpiration") return "1h";
        if (key === "jwtRefreshExpiration") return "7d";
        return "";
      });
      jwtService.sign.mockReturnValue("new-token");
      accessTokenRepository.create.mockReturnValue({} as AccessToken);
      accessTokenRepository.save.mockResolvedValue({} as AccessToken);
      usersService.updateLastLogin.mockResolvedValue(mockUser as User);
    });

    it("should refresh tokens successfully with valid refresh token", async () => {
      jwtService.verify.mockReturnValue({
        id: mockUserId,
        email: "test@example.com",
        confirmAccount: true,
        status: UserStatus.Online,
      });

      const result = await service.refresh("valid-refresh-token");

      expect(result).toBeDefined();
      expect(result.token.access_token).toBe("new-token");
      expect(jwtService.verify).toHaveBeenCalledWith("valid-refresh-token");
    });

    it("should throw UnauthorizedException for invalid refresh token", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(service.refresh("invalid-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for expired refresh token", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await expect(service.refresh("expired-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("register", () => {
    const registerDto = {
      registerMethod: "email" as const,
      email: "newuser@example.com",
      password: "password123",
      fullName: "New User",
      phoneNumber: "9876543210",
      phoneNumberCountryCode: "EG" as any,
      gender: UserGender.Male,
      birthday: new Date("1990-01-01"),
      userLocale: "ar",
      callbackUrl: "https://example.com/verify",
      provider: UserProvider.System,
    };

    it("should register user successfully with email", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhoneNumber.mockResolvedValue(null);
      usersService.register.mockResolvedValue(new ProfileDto(mockUser as User));

      const result = await service.register(registerDto, null);

      expect(result).toBeInstanceOf(ProfileDto);
      expect(usersService.register).toHaveBeenCalledWith(
        "email",
        registerDto,
        null,
      );
    });

    it("should throw ConflictException if email already exists", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);

      await expect(service.register(registerDto, null)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw ConflictException if phone number already exists", async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhoneNumber.mockResolvedValue(mockUser as User);

      await expect(service.register(registerDto, null)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw BadRequestException if registerMethod is missing", async () => {
      const invalidDto = { ...registerDto, registerMethod: undefined as any };
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhoneNumber.mockResolvedValue(null);

      await expect(service.register(invalidDto, null)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should register user with avatar", async () => {
      const mockFile = { buffer: Buffer.from("test") } as Express.Multer.File;
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByPhoneNumber.mockResolvedValue(null);
      usersService.register.mockResolvedValue(new ProfileDto(mockUser as User));

      await service.register(registerDto, mockFile);

      expect(usersService.register).toHaveBeenCalledWith(
        "email",
        registerDto,
        mockFile,
      );
    });
  });

  describe("profile", () => {
    it("should return user profile", async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);

      const result = await service.profile(mockUserId);

      expect(result).toBeInstanceOf(ProfileDto);
      expect(usersService.findOne).toHaveBeenCalledWith(mockUserId);
    });

    it("should throw NotFoundException if user not found", async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(service.profile("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateProfile", () => {
    const updateProfileDto = {
      fullName: "Updated Name",
      email: "updated@example.com",
      phoneNumber: "1234567890",
      phoneNumberCountryCode: "EG" as any,
      gender: UserGender.Male,
      birthday: new Date("1990-01-01"),
      userLocale: "ar",
    };

    it("should update user profile", async () => {
      usersService.updateProfile.mockResolvedValue(
        new ProfileDto({
          ...mockUser,
          fullName: "Updated Name",
        } as User),
      );

      const result = await service.updateProfile(
        mockUserId,
        updateProfileDto,
        null,
      );

      expect(result).toBeInstanceOf(ProfileDto);
      expect(usersService.updateProfile).toHaveBeenCalledWith(
        mockUserId,
        updateProfileDto,
        null,
      );
    });

    it("should update profile with avatar", async () => {
      const mockFile = { buffer: Buffer.from("test") } as Express.Multer.File;
      usersService.updateProfile.mockResolvedValue(
        new ProfileDto(mockUser as User),
      );

      await service.updateProfile(mockUserId, updateProfileDto, mockFile);

      expect(usersService.updateProfile).toHaveBeenCalledWith(
        mockUserId,
        updateProfileDto,
        mockFile,
      );
    });
  });

  describe("forgotPassword", () => {
    it("should send password reset email successfully", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);
      resetPasswordTokenRepository.save.mockResolvedValue(
        {} as ResetPasswordToken,
      );
      mailService.sendMail.mockResolvedValue(undefined);

      const result = await service.forgotPassword({
        email: "test@example.com",
        callbackUrl: "https://example.com/reset",
      });

      expect(result).toBe("Password reset instructions sent to your email");
      expect(resetPasswordTokenRepository.save).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "test@example.com",
          subject: "Reset Your Password",
        }),
      );
    });

    it("should throw NotFoundException if user not found", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword({
          email: "nonexistent@example.com",
          callbackUrl: "https://example.com/reset",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("resetPassword", () => {
    it("should reset password successfully", async () => {
      resetPasswordTokenRepository.findOne.mockResolvedValue({
        email: "test@example.com",
        resetToken: "hashed-token",
        expiresAt: new Date(Date.now() + 1000000),
      } as ResetPasswordToken);
      usersService.updatePassword.mockResolvedValue(mockUser as User);
      resetPasswordTokenRepository.delete.mockResolvedValue({} as any);

      const result = await service.resetPassword({
        token: "valid-token",
        newPassword: "new-password123",
      });

      expect(result).toBe("Password changed successfully");
      expect(usersService.updatePassword).toHaveBeenCalled();
      expect(resetPasswordTokenRepository.delete).toHaveBeenCalled();
    });

    it("should throw BadRequestException for invalid or expired token", async () => {
      resetPasswordTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({
          token: "invalid-token",
          newPassword: "new-password",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);
      bcrypt.compare.mockResolvedValue(true);
      usersService.updatePassword.mockResolvedValue(mockUser as User);

      const result = await service.changePassword(mockUserId, {
        currentPassword: "old-password",
        newPassword: "new-password123",
      });

      expect(result).toBe("Password changed successfully");
      expect(usersService.updatePassword).toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword("nonexistent-id", {
          currentPassword: "old-password",
          newPassword: "new-password",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw UnauthorizedException if current password is incorrect", async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        service.changePassword(mockUserId, {
          currentPassword: "wrong-password",
          newPassword: "new-password",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("verifyEmail", () => {
    it("should verify email successfully", async () => {
      jwtService.verify.mockReturnValue({ userId: mockUserId });
      usersService.findOne.mockResolvedValue(mockUser as User);
      usersService.verifyUserEmail.mockResolvedValue({
        ...mockUser,
        confirmAccount: true,
      } as User);

      const result = await service.verifyEmail({ token: "valid-token" });

      expect(result).toBe("Email verified successfully");
      expect(usersService.verifyUserEmail).toHaveBeenCalledWith(
        "test@example.com",
      );
    });

    it("should throw UnauthorizedException if user not found (caught by try-catch)", async () => {
      jwtService.verify.mockReturnValue({ userId: "nonexistent-id" });
      usersService.findOne.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ token: "valid-token" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for invalid token", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await expect(
        service.verifyEmail({ token: "invalid-token" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("resendVerificationEmail", () => {
    it("should resend verification email successfully", async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        confirmAccount: false,
      } as User);
      jwtService.sign.mockReturnValue("verification-token");
      mailService.sendMail.mockResolvedValue(undefined);

      const result = await service.resendVerificationEmail({
        email: "test@example.com",
        callbackUrl: "https://example.com/verify",
      });

      expect(result).toBe("Verification email resent successfully");
      expect(jwtService.sign).toHaveBeenCalledWith(
        { userId: mockUserId },
        { expiresIn: "1d" },
      );
    });

    it("should return message if email already verified", async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as User);

      const result = await service.resendVerificationEmail({
        email: "test@example.com",
        callbackUrl: "https://example.com/verify",
      });

      expect(result).toBe("Email is already verified");
    });

    it("should throw NotFoundException if user not found", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.resendVerificationEmail({
          email: "nonexistent@example.com",
          callbackUrl: "https://example.com/verify",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("changeEmail", () => {
    it("should return success message for change email", async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);

      const result = await service.changeEmail(mockUserId, {
        newEmail: "newemail@example.com",
        verificationToken: "token123",
      });

      expect(result).toBe("Email changed successfully");
    });

    it("should throw NotFoundException if user not found", async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(
        service.changeEmail("nonexistent-id", {
          newEmail: "newemail@example.com",
          verificationToken: "token123",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteAccount", () => {
    it("should return success message for delete account", async () => {
      usersService.findOne.mockResolvedValue(mockUser as User);

      const result = await service.deleteAccount(mockUserId);

      expect(result).toBe("Account deleted successfully");
    });

    it("should throw NotFoundException if user not found", async () => {
      usersService.findOne.mockResolvedValue(null);

      await expect(service.deleteAccount("nonexistent-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("decodeToken", () => {
    it("should decode token successfully", () => {
      const decodedPayload = { userId: mockUserId, email: "test@example.com" };
      jwtService.decode.mockReturnValue(decodedPayload);

      const result = service.decodeToken("some-token");

      expect(result).toEqual(decodedPayload);
      expect(jwtService.decode).toHaveBeenCalledWith("some-token");
    });

    it("should return null for invalid token", () => {
      jwtService.decode.mockReturnValue(null);

      const result = service.decodeToken("invalid-token");

      expect(result).toBeNull();
    });
  });

  describe("parseExpirationTime (private method via generateAccessToken)", () => {
    beforeEach(() => {
      accessTokenRepository.create.mockReturnValue({} as AccessToken);
      accessTokenRepository.save.mockResolvedValue({} as AccessToken);
      usersService.updateLastLogin.mockResolvedValue(mockUser as User);
      jwtService.sign.mockReturnValue("mock-token");
    });

    it("should parse seconds correctly", async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "jwtAccessExpiration") return "30s";
        if (key === "jwtRefreshExpiration") return "60s";
        return "";
      });

      const result = await service.generateAccessToken(mockUser);

      expect(result).toBeDefined();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: 60 }),
      );
    });

    it("should parse minutes correctly", async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "jwtAccessExpiration") return "30m";
        if (key === "jwtRefreshExpiration") return "60m";
        return "";
      });

      const result = await service.generateAccessToken(mockUser);

      expect(result).toBeDefined();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: 3600 }),
      );
    });

    it("should parse hours correctly", async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "jwtAccessExpiration") return "1h";
        if (key === "jwtRefreshExpiration") return "24h";
        return "";
      });

      const result = await service.generateAccessToken(mockUser);

      expect(result).toBeDefined();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: 86400 }),
      );
    });

    it("should parse days correctly", async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "jwtAccessExpiration") return "1d";
        if (key === "jwtRefreshExpiration") return "7d";
        return "";
      });

      const result = await service.generateAccessToken(mockUser);

      expect(result).toBeDefined();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: 604800 }),
      );
    });

    it("should default to 1 hour for invalid format", async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === "jwtAccessExpiration") return "invalid";
        if (key === "jwtRefreshExpiration") return "invalid";
        return "";
      });

      const result = await service.generateAccessToken(mockUser);

      expect(result).toBeDefined();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: 3600 }),
      );
    });
  });

  describe("logout", () => {
    it("should handle logout (no-op currently)", async () => {
      const result = await service.logout({});

      expect(result).toBeUndefined();
    });
  });
});
