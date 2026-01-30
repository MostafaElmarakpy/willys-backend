import { Test, type TestingModule } from "@nestjs/testing";
import { S3StorageService } from "../../services/upload-media/multer-config.service";
import { UsersAdminController } from "./users-admin.controller";
import { UsersAdminService } from "./users-admin.service";

describe("UsersAdminController", () => {
  let controller: UsersAdminController;
  let usersAdminService: jest.Mocked<UsersAdminService>;

  const mockUserId = "user-123";

  const mockUser = {
    id: mockUserId,
    email: "user@example.com",
    fullName: "Test User",
    phoneNumber: "1234567890",
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersAdminController],
      providers: [
        {
          provide: UsersAdminService,
          useValue: {
            findAll: jest.fn(),
            findAllUsersRole: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
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

    controller = module.get<UsersAdminController>(UsersAdminController);
    usersAdminService = module.get(UsersAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated users", async () => {
      const paginatedResult = {
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      usersAdminService.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(usersAdminService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        "DESC",
      );
      expect(result.message).toBe("Users retrieved successfully");
    });

    it("should use default pagination values", async () => {
      usersAdminService.findAll.mockResolvedValue({
        users: [],
        total: 0,
      } as any);

      await controller.findAll({});

      expect(usersAdminService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        "DESC",
      );
    });
  });

  describe("findAllUsersRole", () => {
    it("should return management users", async () => {
      usersAdminService.findAllUsersRole.mockResolvedValue({
        users: [mockUser],
        total: 1,
      } as any);

      const result = await controller.findAllUsersRole({ page: 1, limit: 10 });

      expect(usersAdminService.findAllUsersRole).toHaveBeenCalled();
      expect(result.message).toBe("Management users retrieved successfully");
    });
  });

  describe("create", () => {
    it("should create a user with avatar", async () => {
      const createDto = {
        email: "new@example.com",
        fullName: "New User",
        password: "password123",
      } as any;
      const mockFile = {
        fieldname: "avatar",
        originalname: "avatar.jpg",
      } as Express.Multer.File;
      usersAdminService.create.mockResolvedValue(mockUser as any);

      const result = await controller.create(mockFile, createDto);

      expect(usersAdminService.create).toHaveBeenCalledWith(createDto, mockFile);
      expect(result.message).toBe("User created successfully");
    });

    it("should create a user without avatar", async () => {
      const createDto = {
        email: "new@example.com",
        fullName: "New User",
      } as any;
      usersAdminService.create.mockResolvedValue(mockUser as any);

      const result = await controller.create(undefined as any, createDto);

      expect(usersAdminService.create).toHaveBeenCalledWith(createDto, undefined);
    });
  });

  describe("findOne", () => {
    it("should return user by id", async () => {
      usersAdminService.findOne.mockResolvedValue(mockUser as any);

      const result = await controller.findOne(mockUserId);

      expect(usersAdminService.findOne).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("User retrieved successfully");
    });
  });

  describe("update", () => {
    it("should update a user", async () => {
      const updateDto = { id: mockUserId, fullName: "Updated Name" } as any;
      const mockFile = {
        fieldname: "avatar",
        originalname: "new-avatar.jpg",
      } as Express.Multer.File;
      const updatedUser = { ...mockUser, fullName: "Updated Name" };
      usersAdminService.update.mockResolvedValue(updatedUser as any);

      const result = await controller.update(mockUserId, updateDto, mockFile);

      expect(usersAdminService.update).toHaveBeenCalledWith(
        mockUserId,
        updateDto,
        mockFile,
      );
      expect(result.message).toBe("User updated successfully");
    });
  });

  describe("remove", () => {
    it("should delete a user", async () => {
      usersAdminService.remove.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.remove(mockUserId);

      expect(usersAdminService.remove).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("User deleted successfully");
    });
  });
});
