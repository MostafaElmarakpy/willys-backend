import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserGender } from "../../common/enums/UserGender";
import { UserProvider } from "../../common/enums/UserProvider";
import { UserRole } from "../../common/enums/UserRole";
import { UserStatus } from "../../common/enums/UserStatus";
import { User } from "../../database/entities/user.entity";
import { UploadMediaService } from "../../services/upload-media/upload-media.service";
import { UsersService } from "./users.service";
import { UsersAdminService } from "./users-admin.service";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

jest.mock("uuid", () => ({
  v4: jest.fn(() => "550e8400-e29b-41d4-a716-446655440000"),
  validate: jest.fn((id: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }),
}));

describe("UsersAdminService", () => {
  let service: UsersAdminService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let usersService: jest.Mocked<UsersService>;
  let uploadMediaService: jest.Mocked<UploadMediaService>;

  const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
  const invalidId = "invalid-id";

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
    confirmAccount: false,
    avatar: "https://example.com/avatar.jpg",
    birthday: new Date("1990-01-01"),
    joined: new Date(),
    gender: UserGender.Male,
    userLocale: "ar",
    verificationCode: "1234",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
    lastLogout: new Date(),
  };

  const mockAdminUser: Partial<User> = {
    ...mockUser,
    role: UserRole.admin,
    adminRoleId: "role-123",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersAdminService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByPhoneNumberAndCountryCode: jest.fn(),
          },
        },
        {
          provide: UploadMediaService,
          useValue: {
            saveOneFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersAdminService>(UsersAdminService);
    usersRepository = module.get(getRepositoryToken(User));
    usersService = module.get(UsersService);
    uploadMediaService = module.get(UploadMediaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const createUserDto = {
      fullName: "New User",
      email: "newuser@example.com",
      password: "password123",
      phoneNumber: "9876543210",
      phoneNumberCountryCode: "EG" as any,
      role: UserRole.admin,
      gender: UserGender.Male,
      status: UserStatus.Online,
      userLocale: "ar",
      adminRoleId: "role-123",
    };

    it("should create a new user successfully", async () => {
      usersRepository.findOne.mockResolvedValue(null);
      usersService.findByPhoneNumberAndCountryCode.mockResolvedValue(null);
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: "https://example.com/avatar.jpg",
      } as any);
      usersRepository.save.mockResolvedValue(mockAdminUser as User);

      const result = await service.create(createUserDto, null);

      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.admin);
      expect(usersRepository.save).toHaveBeenCalled();
    });

    it("should throw ConflictException if email already exists", async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      await expect(service.create(createUserDto, null)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw ConflictException if phone number already exists", async () => {
      usersRepository.findOne.mockResolvedValue(null);
      usersService.findByPhoneNumberAndCountryCode.mockResolvedValue(
        mockUser as User,
      );

      await expect(service.create(createUserDto, null)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should upload avatar if provided", async () => {
      const mockFile = { buffer: Buffer.from("test") } as Express.Multer.File;

      usersRepository.findOne.mockResolvedValue(null);
      usersService.findByPhoneNumberAndCountryCode.mockResolvedValue(null);
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: "https://example.com/new-avatar.jpg",
      } as any);
      usersRepository.save.mockResolvedValue(mockAdminUser as User);

      await service.create(createUserDto, mockFile);

      expect(uploadMediaService.saveOneFile).toHaveBeenCalledWith(
        mockFile,
        "users",
        expect.any(String),
      );
    });

    it("should create user without email", async () => {
      const dtoWithoutEmail = { ...createUserDto, email: undefined };

      usersService.findByPhoneNumberAndCountryCode.mockResolvedValue(null);
      uploadMediaService.saveOneFile.mockResolvedValue(undefined);
      usersRepository.save.mockResolvedValue({
        ...mockAdminUser,
        email: undefined,
      } as User);

      const result = await service.create(dtoWithoutEmail, null);

      expect(result).toBeDefined();
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it("should create user without phone number", async () => {
      const dtoWithoutPhone = { ...createUserDto, phoneNumber: undefined };

      usersRepository.findOne.mockResolvedValue(null);
      uploadMediaService.saveOneFile.mockResolvedValue(undefined);
      usersRepository.save.mockResolvedValue({
        ...mockAdminUser,
        phoneNumber: undefined,
      } as User);

      const result = await service.create(dtoWithoutPhone, null);

      expect(result).toBeDefined();
      expect(
        usersService.findByPhoneNumberAndCountryCode,
      ).not.toHaveBeenCalled();
    });
  });

  describe("findByEmail", () => {
    it("should return user by email", async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByEmail("test@example.com");

      expect(result).toBeDefined();
      expect(result?.email).toBe("test@example.com");
    });

    it("should return null if user not found", async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail("nonexistent@example.com");

      expect(result).toBeNull();
    });
  });

  describe("findOne", () => {
    it("should return user by valid UUID", async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findOne(mockUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockUserId);
    });

    it("should throw BadRequestException for invalid UUID format", async () => {
      await expect(service.findOne(invalidId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return null if user not found", async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should return paginated users with USER role", async () => {
      usersRepository.findAndCount.mockResolvedValue([[mockUser as User], 1]);

      const result = await service.findAll(1, 10);

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: UserRole.user },
        }),
      );
    });

    it("should apply pagination correctly", async () => {
      usersRepository.findAndCount.mockResolvedValue([[mockUser as User], 25]);

      const result = await service.findAll(2, 10);

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.totalPages).toBe(3);
    });

    it("should sort by allowed field", async () => {
      usersRepository.findAndCount.mockResolvedValue([[mockUser as User], 1]);

      await service.findAll(1, 10, "email", "ASC");

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { email: "ASC" },
        }),
      );
    });

    it("should default to createdAt sort for invalid field", async () => {
      usersRepository.findAndCount.mockResolvedValue([[mockUser as User], 1]);

      await service.findAll(1, 10, "invalidField", "DESC");

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: "DESC" },
        }),
      );
    });

    it("should select only required fields", async () => {
      usersRepository.findAndCount.mockResolvedValue([[mockUser as User], 1]);

      await service.findAll(1, 10);

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            phoneNumberCountryCode: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      );
    });
  });

  describe("findAllUsersRole", () => {
    it("should return paginated users with ADMIN role", async () => {
      usersRepository.findAndCount.mockResolvedValue([
        [mockAdminUser as User],
        1,
      ]);

      const result = await service.findAllUsersRole(1, 10);

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: UserRole.admin },
        }),
      );
    });

    it("should apply pagination correctly", async () => {
      usersRepository.findAndCount.mockResolvedValue([
        [mockAdminUser as User],
        25,
      ]);

      const result = await service.findAllUsersRole(3, 10);

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
      expect(result.totalPages).toBe(3);
    });

    it("should sort by allowed field including role", async () => {
      usersRepository.findAndCount.mockResolvedValue([
        [mockAdminUser as User],
        1,
      ]);

      await service.findAllUsersRole(1, 10, "role", "ASC");

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { role: "ASC" },
        }),
      );
    });

    it("should include role in select fields", async () => {
      usersRepository.findAndCount.mockResolvedValue([
        [mockAdminUser as User],
        1,
      ]);

      await service.findAllUsersRole(1, 10);

      expect(usersRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            role: true,
          }),
        }),
      );
    });
  });

  describe("update", () => {
    const updateUserDto = {
      id: mockUserId,
      fullName: "Updated Name",
      status: UserStatus.Blocked,
    } as any;

    it("should update user successfully", async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce({ ...mockUser, ...updateUserDto } as User);
      uploadMediaService.saveOneFile.mockResolvedValue(undefined);
      usersRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.update(mockUserId, updateUserDto, null);

      expect(result).toBeDefined();
      expect(usersRepository.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          fullName: "Updated Name",
          status: UserStatus.Blocked,
        }),
      );
    });

    it("should throw BadRequestException for invalid UUID format", async () => {
      await expect(
        service.update(invalidId, updateUserDto, null),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if user not found", async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockUserId, updateUserDto, null),
      ).rejects.toThrow(NotFoundException);
    });

    it("should upload new avatar if provided", async () => {
      const mockFile = { buffer: Buffer.from("test") } as Express.Multer.File;

      usersRepository.findOne
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce({
          ...mockUser,
          avatar: "https://example.com/new-avatar.jpg",
        } as User);
      uploadMediaService.saveOneFile.mockResolvedValue({
        url: "https://example.com/new-avatar.jpg",
      } as any);
      usersRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(mockUserId, updateUserDto, mockFile);

      expect(uploadMediaService.saveOneFile).toHaveBeenCalledWith(
        mockFile,
        "users",
        mockUserId,
      );
    });

    it("should keep existing avatar if no file provided", async () => {
      usersRepository.findOne
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce(mockUser as User);
      uploadMediaService.saveOneFile.mockResolvedValue(undefined);
      usersRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(mockUserId, updateUserDto, null);

      expect(usersRepository.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          avatar: mockUser.avatar,
        }),
      );
    });

    it("should update user role if provided", async () => {
      const updateWithRole = { ...updateUserDto, role: UserRole.admin };

      usersRepository.findOne
        .mockResolvedValueOnce(mockUser as User)
        .mockResolvedValueOnce({ ...mockUser, role: UserRole.admin } as User);
      uploadMediaService.saveOneFile.mockResolvedValue(undefined);
      usersRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.update(mockUserId, updateWithRole, null);

      expect(usersRepository.update).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          role: UserRole.admin,
        }),
      );
    });
  });

  describe("remove", () => {
    it("should soft delete user successfully", async () => {
      usersRepository.findOne.mockResolvedValue(mockUser as User);
      usersRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockUserId);

      expect(usersRepository.softDelete).toHaveBeenCalledWith(mockUserId);
    });

    it("should throw BadRequestException for invalid UUID format", async () => {
      await expect(service.remove(invalidId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException if user not found", async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
