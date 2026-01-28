import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { NotificationType } from "../../common/enums/NotificationType";
import { UserRole } from "../../common/enums/UserRole";
import { AdminFcmToken } from "../../database/entities/admin-fcm-token.entity";
import { AdminNotification } from "../../database/entities/admin-notification.entity";
import { AdminNotificationPreferences } from "../../database/entities/admin-notification-preferences.entity";
import { User } from "../../database/entities/user.entity";
import { FcmService } from "./fcm.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let fcmTokenRepository: jest.Mocked<Repository<AdminFcmToken>>;
  let notificationRepository: jest.Mocked<Repository<AdminNotification>>;
  let preferencesRepository: jest.Mocked<
    Repository<AdminNotificationPreferences>
  >;
  let _userRepository: jest.Mocked<Repository<User>>;
  let fcmService: jest.Mocked<FcmService>;
  let queryBuilder: any;

  const mockUserId = "user-123";
  const mockToken = "fcm-token-123";

  const mockFcmToken: Partial<AdminFcmToken> = {
    id: "token-id-123",
    userId: mockUserId,
    token: mockToken,
    deviceId: "device-123",
    deviceType: "web",
    isActive: true,
    lastUsedAt: new Date(),
  };

  const mockPreferences: Partial<AdminNotificationPreferences> = {
    id: "pref-123",
    userId: mockUserId,
    pushEnabled: true,
    orderNew: true,
    orderStatusChanged: true,
    userRegistered: true,
    paymentSuccess: true,
    paymentFailed: true,
    paymentRefunded: true,
  };

  const mockNotification: Partial<AdminNotification> = {
    id: "notif-123",
    type: NotificationType.ORDER_NEW,
    title: "New Order",
    message: "A new order has been placed",
    isRead: false,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getCount: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(AdminFcmToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AdminNotification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
            manager: {
              connection: { isInitialized: true },
            },
          },
        },
        {
          provide: getRepositoryToken(AdminNotificationPreferences),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
          },
        },
        {
          provide: FcmService,
          useValue: {
            sendToTokens: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    fcmTokenRepository = module.get(getRepositoryToken(AdminFcmToken));
    notificationRepository = module.get(getRepositoryToken(AdminNotification));
    preferencesRepository = module.get(
      getRepositoryToken(AdminNotificationPreferences),
    );
    _userRepository = module.get(getRepositoryToken(User));
    fcmService = module.get(FcmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerToken", () => {
    const registerDto = {
      token: mockToken,
      deviceId: "device-123",
      deviceType: "web" as const,
      userAgent: "Mozilla/5.0",
    };

    it("should update existing token if found", async () => {
      fcmTokenRepository.findOne.mockResolvedValue(
        mockFcmToken as AdminFcmToken,
      );
      fcmTokenRepository.save.mockResolvedValue(mockFcmToken as AdminFcmToken);

      const result = await service.registerToken(mockUserId, registerDto);

      expect(result).toEqual(mockFcmToken);
      expect(fcmTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });

    it("should create new token if not found", async () => {
      fcmTokenRepository.findOne.mockResolvedValue(null);
      fcmTokenRepository.create.mockReturnValue(mockFcmToken as AdminFcmToken);
      fcmTokenRepository.save.mockResolvedValue(mockFcmToken as AdminFcmToken);

      const result = await service.registerToken(mockUserId, registerDto);

      expect(result).toBeDefined();
      expect(fcmTokenRepository.create).toHaveBeenCalled();
    });

    it("should deactivate old tokens with same deviceId", async () => {
      fcmTokenRepository.findOne.mockResolvedValue(null);
      fcmTokenRepository.create.mockReturnValue(mockFcmToken as AdminFcmToken);
      fcmTokenRepository.save.mockResolvedValue(mockFcmToken as AdminFcmToken);
      fcmTokenRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.registerToken(mockUserId, registerDto);

      expect(fcmTokenRepository.update).toHaveBeenCalledWith(
        { userId: mockUserId, deviceId: registerDto.deviceId },
        { isActive: false },
      );
    });

    it("should not deactivate old tokens if no deviceId provided", async () => {
      const dtoWithoutDevice = { token: mockToken };
      fcmTokenRepository.findOne.mockResolvedValue(null);
      fcmTokenRepository.create.mockReturnValue(mockFcmToken as AdminFcmToken);
      fcmTokenRepository.save.mockResolvedValue(mockFcmToken as AdminFcmToken);

      await service.registerToken(mockUserId, dtoWithoutDevice);

      expect(fcmTokenRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("removeToken", () => {
    it("should deactivate token", async () => {
      fcmTokenRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.removeToken(mockUserId, mockToken);

      expect(fcmTokenRepository.update).toHaveBeenCalledWith(
        { userId: mockUserId, token: mockToken },
        { isActive: false },
      );
    });
  });

  describe("removeInvalidToken", () => {
    it("should delete invalid token", async () => {
      fcmTokenRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeInvalidToken(mockToken);

      expect(fcmTokenRepository.delete).toHaveBeenCalledWith({
        token: mockToken,
      });
    });
  });

  describe("getPreferences", () => {
    it("should return existing preferences", async () => {
      preferencesRepository.findOne.mockResolvedValue(
        mockPreferences as AdminNotificationPreferences,
      );

      const result = await service.getPreferences(mockUserId);

      expect(result).toEqual(mockPreferences);
    });

    it("should create default preferences if not found", async () => {
      preferencesRepository.findOne.mockResolvedValue(null);
      preferencesRepository.create.mockReturnValue(
        mockPreferences as AdminNotificationPreferences,
      );
      preferencesRepository.save.mockResolvedValue(
        mockPreferences as AdminNotificationPreferences,
      );

      const result = await service.getPreferences(mockUserId);

      expect(result).toBeDefined();
      expect(preferencesRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
      });
      expect(preferencesRepository.save).toHaveBeenCalled();
    });
  });

  describe("updatePreferences", () => {
    const updateDto = {
      pushEnabled: false,
      orderNew: false,
    };

    it("should update existing preferences", async () => {
      preferencesRepository.findOne.mockResolvedValue(
        mockPreferences as AdminNotificationPreferences,
      );
      preferencesRepository.save.mockResolvedValue({
        ...mockPreferences,
        ...updateDto,
      } as AdminNotificationPreferences);

      const result = await service.updatePreferences(mockUserId, updateDto);

      expect(result.pushEnabled).toBe(false);
    });

    it("should create preferences if not found", async () => {
      preferencesRepository.findOne.mockResolvedValue(null);
      preferencesRepository.create.mockReturnValue({
        userId: mockUserId,
        ...updateDto,
      } as AdminNotificationPreferences);
      preferencesRepository.save.mockResolvedValue({
        userId: mockUserId,
        ...updateDto,
      } as AdminNotificationPreferences);

      const result = await service.updatePreferences(mockUserId, updateDto);

      expect(result).toBeDefined();
      expect(preferencesRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        ...updateDto,
      });
    });
  });

  describe("getNotifications", () => {
    it("should return paginated notifications", async () => {
      const notifications = [mockNotification as AdminNotification];
      queryBuilder.getManyAndCount.mockResolvedValue([notifications, 1]);
      queryBuilder.getCount.mockResolvedValue(1);

      const result = await service.getNotifications(mockUserId, {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual({
        notifications,
        total: 1,
        unreadCount: 1,
      });
    });

    it("should filter by type", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      queryBuilder.getCount.mockResolvedValue(0);

      await service.getNotifications(mockUserId, {
        page: 1,
        limit: 20,
        type: NotificationType.ORDER_NEW,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "notification.type = :type",
        { type: NotificationType.ORDER_NEW },
      );
    });

    it("should filter by isRead", async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      queryBuilder.getCount.mockResolvedValue(0);

      await service.getNotifications(mockUserId, {
        page: 1,
        limit: 20,
        isRead: false,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        "notification.isRead = :isRead",
        { isRead: false },
      );
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read", async () => {
      notificationRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.markAsRead(mockUserId, mockNotification.id!);

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { id: mockNotification.id },
        expect.objectContaining({ isRead: true }),
      );
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications as read", async () => {
      queryBuilder.execute.mockResolvedValue({ affected: 5 });

      await service.markAllAsRead(mockUserId);

      expect(queryBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({ isRead: true }),
      );
      expect(queryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe("sendNotificationToAdmins", () => {
    beforeEach(() => {
      // Mock database connection
      (notificationRepository as any).manager = {
        connection: { isInitialized: true },
      };
    });

    it("should skip if database not initialized", async () => {
      (notificationRepository as any).manager = {
        connection: { isInitialized: false },
      };

      await service.sendNotificationToAdmins(
        NotificationType.ORDER_NEW,
        "Title",
        "Message",
      );

      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it("should create notification and send to admins with tokens", async () => {
      notificationRepository.create.mockReturnValue(
        mockNotification as AdminNotification,
      );
      notificationRepository.save.mockResolvedValue(
        mockNotification as AdminNotification,
      );

      const mockAdmin = {
        id: mockUserId,
        role: UserRole.admin,
        adminNotificationPreferences: mockPreferences,
        adminFcmTokens: [mockFcmToken],
      };
      queryBuilder.getMany.mockResolvedValue([mockAdmin]);

      fcmService.sendToTokens.mockResolvedValue({
        success: [mockToken],
        failed: [],
        tokensToRemove: [],
      });

      await service.sendNotificationToAdmins(
        NotificationType.ORDER_NEW,
        "New Order",
        "A new order has been placed",
      );

      expect(notificationRepository.create).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(fcmService.sendToTokens).toHaveBeenCalled();
    });

    it("should remove invalid tokens after sending", async () => {
      notificationRepository.create.mockReturnValue(
        mockNotification as AdminNotification,
      );
      notificationRepository.save.mockResolvedValue(
        mockNotification as AdminNotification,
      );

      const mockAdmin = {
        id: mockUserId,
        role: UserRole.admin,
        adminNotificationPreferences: mockPreferences,
        adminFcmTokens: [mockFcmToken],
      };
      queryBuilder.getMany.mockResolvedValue([mockAdmin]);

      fcmService.sendToTokens.mockResolvedValue({
        success: [],
        failed: [mockToken],
        tokensToRemove: [mockToken],
      });
      fcmTokenRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.sendNotificationToAdmins(
        NotificationType.ORDER_NEW,
        "New Order",
        "A new order has been placed",
      );

      // Verify the notification flow executed
      expect(fcmService.sendToTokens).toHaveBeenCalledWith(
        [mockToken],
        expect.objectContaining({
          title: "New Order",
          body: "A new order has been placed",
        }),
        expect.any(Object),
      );
      expect(fcmTokenRepository.delete).toHaveBeenCalledWith({
        token: mockToken,
      });
    });

    it("should handle database errors gracefully", async () => {
      notificationRepository.create.mockReturnValue(
        mockNotification as AdminNotification,
      );
      notificationRepository.save.mockRejectedValue(
        new Error("Driver not Connected"),
      );

      // Should not throw
      await expect(
        service.sendNotificationToAdmins(
          NotificationType.ORDER_NEW,
          "Title",
          "Message",
        ),
      ).resolves.not.toThrow();
    });
  });
});
