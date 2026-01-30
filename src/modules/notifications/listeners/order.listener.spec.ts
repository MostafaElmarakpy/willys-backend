import { Test, type TestingModule } from "@nestjs/testing";
import { OrderEventListener } from "./order.listener";
import { NotificationsService } from "../notifications.service";
import { NotificationType } from "src/common/enums/NotificationType";

describe("OrderEventListener", () => {
  let listener: OrderEventListener;
  let notificationsService: jest.Mocked<NotificationsService>;

  const mockOrderCreatedEvent = {
    orderId: "order-123",
    orderNumber: "ORD-001",
    userId: "user-123",
    customerName: "John Doe",
    total: 150.0,
    branchId: "branch-123",
    branchName: "Main Branch",
    orderType: "DELIVERY",
  };

  const mockOrderStatusChangedEvent = {
    orderId: "order-123",
    orderNumber: "ORD-001",
    previousStatus: "PENDING",
    newStatus: "CONFIRMED",
    customerName: "John Doe",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventListener,
        {
          provide: NotificationsService,
          useValue: {
            sendNotificationToAdmins: jest.fn(),
          },
        },
      ],
    }).compile();

    listener = module.get<OrderEventListener>(OrderEventListener);
    notificationsService = module.get(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleOrderCreated", () => {
    it("should send notification to admins when order is created", async () => {
      notificationsService.sendNotificationToAdmins.mockResolvedValue(undefined);

      await listener.handleOrderCreated(mockOrderCreatedEvent);

      expect(notificationsService.sendNotificationToAdmins).toHaveBeenCalledWith(
        NotificationType.ORDER_NEW,
        "New Order Received",
        expect.stringContaining(mockOrderCreatedEvent.orderNumber),
        expect.objectContaining({
          orderId: mockOrderCreatedEvent.orderId,
          orderNumber: mockOrderCreatedEvent.orderNumber,
          userId: mockOrderCreatedEvent.userId,
          total: mockOrderCreatedEvent.total,
          branchId: mockOrderCreatedEvent.branchId,
          branchName: mockOrderCreatedEvent.branchName,
          orderType: mockOrderCreatedEvent.orderType,
          link: `/orders/${mockOrderCreatedEvent.orderId}`,
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      notificationsService.sendNotificationToAdmins.mockRejectedValue(
        new Error("Notification failed"),
      );

      await expect(
        listener.handleOrderCreated(mockOrderCreatedEvent),
      ).resolves.not.toThrow();
    });
  });

  describe("handleOrderStatusChanged", () => {
    it("should send notification to admins when order status changes", async () => {
      notificationsService.sendNotificationToAdmins.mockResolvedValue(undefined);

      await listener.handleOrderStatusChanged(mockOrderStatusChangedEvent);

      expect(notificationsService.sendNotificationToAdmins).toHaveBeenCalledWith(
        NotificationType.ORDER_STATUS_CHANGED,
        "Order Status Updated",
        expect.stringContaining(mockOrderStatusChangedEvent.orderNumber),
        expect.objectContaining({
          orderId: mockOrderStatusChangedEvent.orderId,
          orderNumber: mockOrderStatusChangedEvent.orderNumber,
          previousStatus: mockOrderStatusChangedEvent.previousStatus,
          newStatus: mockOrderStatusChangedEvent.newStatus,
          link: `/orders/${mockOrderStatusChangedEvent.orderId}`,
        }),
      );
    });

    it("should handle errors gracefully", async () => {
      notificationsService.sendNotificationToAdmins.mockRejectedValue(
        new Error("Notification failed"),
      );

      await expect(
        listener.handleOrderStatusChanged(mockOrderStatusChangedEvent),
      ).resolves.not.toThrow();
    });
  });
});
