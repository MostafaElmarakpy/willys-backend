import { Test, type TestingModule } from "@nestjs/testing";
import { S3StorageService } from "../services/upload-media/multer-config.service";
import { AuthenticationController } from "./authentication.controller";
import { AuthenticationService } from "./authentication.service";

describe("AuthenticationController", () => {
  let controller: AuthenticationController;
  let authService: jest.Mocked<AuthenticationService>;

  const mockUserId = "user-123";
  const mockUser = {
    id: mockUserId,
    email: "test@example.com",
    fullName: "Test User",
  };

  const mockTokens = {
    access_token: "access-token",
    refresh_token: "refresh-token",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: AuthenticationService,
          useValue: {
            login: jest.fn(),
            refresh: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            profile: jest.fn(),
            updateProfile: jest.fn(),
            resetPassword: jest.fn(),
            changePassword: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerificationEmail: jest.fn(),
            changeEmail: jest.fn(),
            deleteAccount: jest.fn(),
          },
        },
        {
          provide: S3StorageService,
          useValue: {
            multerOptions: jest.fn().mockReturnValue({}),
            validateFileSize: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
    authService = module.get(AuthenticationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should login user and return tokens", async () => {
      const loginDto = {
        email: "test@example.com",
        password: "password123",
      } as any;
      authService.login.mockResolvedValue({
        user: mockUser,
        ...mockTokens,
      } as any);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result.data).toEqual({ user: mockUser, ...mockTokens });
    });
  });

  describe("refresh", () => {
    it("should refresh tokens", async () => {
      const refreshDto = { refresh_token: "old-refresh-token" };
      authService.refresh.mockResolvedValue(mockTokens as any);

      const result = await controller.refresh(refreshDto);

      expect(authService.refresh).toHaveBeenCalledWith("old-refresh-token");
      expect(result.data).toEqual(mockTokens);
    });
  });

  describe("register", () => {
    it("should register new user", async () => {
      const registerDto = {
        email: "new@example.com",
        password: "password123",
        fullName: "New User",
        phoneNumber: "1234567890",
        phoneNumberCountryCode: "+20",
      } as any;
      const mockFile = {
        fieldname: "avatar",
        originalname: "avatar.jpg",
      } as Express.Multer.File;
      authService.register.mockResolvedValue({
        user: mockUser,
        ...mockTokens,
      } as any);

      const result = await controller.register(mockFile, registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto, mockFile);
      expect(result.data).toEqual({ user: mockUser, ...mockTokens });
    });

    it("should register user without avatar", async () => {
      const registerDto = {
        email: "new@example.com",
        password: "password123",
        fullName: "New User",
        phoneNumber: "1234567890",
        phoneNumberCountryCode: "+20",
      } as any;
      authService.register.mockResolvedValue({
        user: mockUser,
        ...mockTokens,
      } as any);

      const result = await controller.register(undefined as any, registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto, undefined);
      expect(result.data).toBeDefined();
    });
  });

  describe("logout", () => {
    it("should logout user", async () => {
      const mockReq = { user: { id: mockUserId } };
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(mockReq);

      expect(authService.logout).toHaveBeenCalledWith(mockReq);
      expect(result.data).toEqual([]);
    });
  });

  describe("profile", () => {
    it("should return user profile", async () => {
      const mockReq = { user: { id: mockUserId } };
      authService.profile.mockResolvedValue(mockUser as any);

      const result = await controller.profile(mockReq);

      expect(authService.profile).toHaveBeenCalledWith(mockUserId);
      expect(result.data).toEqual(mockUser);
    });
  });

  describe("updateProfile", () => {
    it("should update user profile", async () => {
      const mockReq = { user: { id: mockUserId } };
      const updateDto = { fullName: "Updated Name" } as any;
      const mockFile = {
        fieldname: "avatar",
        originalname: "new-avatar.jpg",
      } as Express.Multer.File;
      authService.updateProfile.mockResolvedValue({
        ...mockUser,
        fullName: "Updated Name",
      } as any);

      const result = await controller.updateProfile(
        mockReq,
        updateDto,
        mockFile,
      );

      expect(authService.updateProfile).toHaveBeenCalledWith(
        mockUserId,
        updateDto,
        mockFile,
      );
      expect(result.data.fullName).toBe("Updated Name");
    });
  });

  describe("resetPassword", () => {
    it("should reset password", async () => {
      const resetDto = {
        token: "reset-token",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      };
      authService.resetPassword.mockResolvedValue(
        "Password reset successfully" as any,
      );

      const result = await controller.resetPassword(resetDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(resetDto);
      expect(result.data.message).toBe("Password reset successfully");
    });
  });

  describe("changePassword", () => {
    it("should change password", async () => {
      const mockReq = { user: { id: mockUserId } };
      const changeDto = {
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
      };
      authService.changePassword.mockResolvedValue(
        "Password changed successfully",
      );

      const result = await controller.changePassword(mockReq, changeDto);

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUserId,
        changeDto,
      );
      expect(result.data.message).toBe("Password changed successfully");
    });
  });

  describe("verifyEmail", () => {
    it("should verify email", async () => {
      const verifyDto = { token: "verify-token" };
      authService.verifyEmail.mockResolvedValue("Email verified successfully");

      const result = await controller.verifyEmail(verifyDto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyDto);
      expect(result.data.message).toBe("Email verified successfully");
    });
  });

  describe("resendVerificationEmail", () => {
    it("should resend verification email", async () => {
      const resendDto = {
        email: "test@example.com",
        callbackUrl: "https://example.com/verify",
      };
      authService.resendVerificationEmail.mockResolvedValue(
        "Verification email resent successfully" as any,
      );

      const result = await controller.resendVerificationEmail(resendDto);

      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(
        resendDto,
      );
      expect(result.data.message).toBe(
        "Verification email resent successfully",
      );
    });
  });

  describe("changeEmail", () => {
    it("should change email", async () => {
      const mockReq = { user: { id: mockUserId } };
      const changeDto = {
        newEmail: "newemail@example.com",
        verificationToken: "token-123",
      };
      authService.changeEmail.mockResolvedValue(
        "Email change initiated" as any,
      );

      const result = await controller.changeEmail(mockReq, changeDto);

      expect(authService.changeEmail).toHaveBeenCalledWith(
        mockUserId,
        changeDto,
      );
      expect(result.data.message).toBe("Email change initiated");
    });
  });

  describe("deleteAccount", () => {
    it("should delete account", async () => {
      const mockReq = { user: { id: mockUserId } };
      authService.deleteAccount.mockResolvedValue("Account deleted");

      const result = await controller.deleteAccount(mockReq);

      expect(authService.deleteAccount).toHaveBeenCalledWith(mockUserId);
      expect(result.data.message).toBe("Account deleted");
    });
  });
});
