import { Test, type TestingModule } from "@nestjs/testing";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

describe("NotificationsController", () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUserId = "user-123";
  const mockNotificationId = "notification-123";

  const mockToken = {
    id: "token-123",
    token: "fcm-token-abc",
    userId: mockUserId,
    deviceType: "android",
  };

  const mockPreferences = {
    userId: mockUserId,
    pushEnabled: true,
    emailEnabled: true,
    orderUpdates: true,
    promotions: false,
  };

  const mockNotification = {
    id: mockNotificationId,
    userId: mockUserId,
    title: "Order Update",
    body: "Your order is ready",
    isRead: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            registerToken: jest.fn(),
            removeToken: jest.fn(),
            getPreferences: jest.fn(),
            updatePreferences: jest.fn(),
            getNotifications: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerFcmToken", () => {
    it("should register FCM token", async () => {
      const dto = { token: "fcm-token-abc", deviceType: "android" as const };
      notificationsService.registerToken.mockResolvedValue(mockToken as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.registerFcmToken(mockReq, dto);

      expect(notificationsService.registerToken).toHaveBeenCalledWith(
        mockUserId,
        dto,
      );
      expect(result.message).toBe("FCM token registered successfully");
      expect(result.data).toEqual(mockToken);
    });
  });

  describe("removeFcmToken", () => {
    it("should remove FCM token", async () => {
      notificationsService.removeToken.mockResolvedValue(undefined);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.removeFcmToken(mockReq, "fcm-token-abc");

      expect(notificationsService.removeToken).toHaveBeenCalledWith(
        mockUserId,
        "fcm-token-abc",
      );
      expect(result.message).toBe("FCM token removed successfully");
    });
  });

  describe("getPreferences", () => {
    it("should return notification preferences", async () => {
      notificationsService.getPreferences.mockResolvedValue(
        mockPreferences as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getPreferences(mockReq);

      expect(notificationsService.getPreferences).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result.message).toBe("Preferences retrieved successfully");
      expect(result.data).toEqual(mockPreferences);
    });
  });

  describe("updatePreferences", () => {
    it("should update notification preferences", async () => {
      const updateDto = { pushEnabled: false, promotions: true };
      const updatedPreferences = { ...mockPreferences, ...updateDto };
      notificationsService.updatePreferences.mockResolvedValue(
        updatedPreferences as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.updatePreferences(mockReq, updateDto);

      expect(notificationsService.updatePreferences).toHaveBeenCalledWith(
        mockUserId,
        updateDto,
      );
      expect(result.message).toBe("Preferences updated successfully");
    });
  });

  describe("getNotifications", () => {
    it("should return user notifications", async () => {
      const filterDto = { page: 1, limit: 10 };
      const notificationsResult = {
        notifications: [mockNotification],
        total: 1,
        page: 1,
        limit: 10,
      };
      notificationsService.getNotifications.mockResolvedValue(
        notificationsResult as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getNotifications(mockReq, filterDto);

      expect(notificationsService.getNotifications).toHaveBeenCalledWith(
        mockUserId,
        filterDto,
      );
      expect(result.message).toBe("Notifications retrieved successfully");
    });

    it("should return empty notifications when none exist", async () => {
      notificationsService.getNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
        page: 1,
        limit: 10,
      } as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getNotifications(mockReq, {});

      expect(result.data.notifications).toEqual([]);
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read", async () => {
      notificationsService.markAsRead.mockResolvedValue(undefined);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.markAsRead(mockReq, mockNotificationId);

      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        mockUserId,
        mockNotificationId,
      );
      expect(result.message).toBe("Notification marked as read");
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications as read", async () => {
      notificationsService.markAllAsRead.mockResolvedValue(undefined);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.markAllAsRead(mockReq);

      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result.message).toBe("All notifications marked as read");
    });
  });
});
