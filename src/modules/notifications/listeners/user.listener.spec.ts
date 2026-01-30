import { Test, type TestingModule } from "@nestjs/testing";
import { NotificationType } from "src/common/enums/NotificationType";
import { NotificationsService } from "../notifications.service";
import { UserEventListener } from "./user.listener";

describe("UserEventListener", () => {
  let listener: UserEventListener;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockUserRegisteredEvent = {
    userId: "user-123",
    fullName: "John Doe",
    email: "john@example.com",
    phoneNumber: "+201234567890",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEventListener,
        {
          provide: NotificationsService,
          useValue: {
            sendNotificationToAdmins: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<UserEventListener>(UserEventListener);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleUserRegistered", () => {
    it("should send notification to admins when user registers with email", async () => {
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handleUserRegistered(mockUserRegisteredEvent);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.USER_REGISTERED,
        "New User Registered",
        expect.stringContaining(mockUserRegisteredEvent.fullName),
        expect.objectContaining({
          userId: mockUserRegisteredEvent.userId,
          fullName: mockUserRegisteredEvent.fullName,
          email: mockUserRegisteredEvent.email,
          phoneNumber: mockUserRegisteredEvent.phoneNumber,
          link: `/customers/${mockUserRegisteredEvent.userId}`,
        }),
      );
    });

    it("should send notification with phone number when email is not provided", async () => {
      const eventWithPhoneOnly = {
        ...mockUserRegisteredEvent,
        email: undefined,
      };
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handleUserRegistered(eventWithPhoneOnly as any);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.USER_REGISTERED,
        "New User Registered",
        expect.stringContaining(eventWithPhoneOnly.phoneNumber as string),
        expect.objectContaining({
          email: "",
          phoneNumber: eventWithPhoneOnly.phoneNumber,
        }),
      );
    });

    it("should send notification with 'No contact info' when neither email nor phone provided", async () => {
      const eventWithNoContact = {
        userId: "user-123",
        fullName: "John Doe",
        email: undefined,
        phoneNumber: undefined,
      };
      notificationsService.sendNotificationToAdmins.mockResolvedValue(
        undefined,
      );

      await listener.handleUserRegistered(eventWithNoContact as any);

      expect(
        notificationsService.sendNotificationToAdmins,
      ).toHaveBeenCalledWith(
        NotificationType.USER_REGISTERED,
        "New User Registered",
        expect.stringContaining("No contact info"),
        expect.objectContaining({
          email: "",
          phoneNumber: "",
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      notificationsService.sendNotificationToAdmins.mockRejectedValue(
        new Error("Notification failed"),
      );

      await expect(
        listener.handleUserRegistered(mockUserRegisteredEvent),
      ).resolves.not.toThrow();
    });
  });
});
