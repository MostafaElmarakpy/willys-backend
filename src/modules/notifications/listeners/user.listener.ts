import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationType } from "src/common/enums/NotificationType";
import { UserRegisteredEvent } from "../events/user.events";
import { NotificationsService } from "../notifications.service";

@Injectable()
export class UserEventListener {
  private readonly logger = new Logger(UserEventListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent("user.registered")
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    try {
      this.logger.log(`User registered event received: ${event.fullName}`);

      const contactInfo = event.email || event.phoneNumber || "No contact info";

      await this.notificationsService.sendNotificationToAdmins(
        NotificationType.USER_REGISTERED,
        "New User Registered",
        `${event.fullName} has created a new account (${contactInfo})`,
        {
          userId: event.userId,
          fullName: event.fullName,
          email: event.email || "",
          phoneNumber: event.phoneNumber || "",
          link: `/customers/${event.userId}`,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle user registered event: ${error.message}`,
      );
    }
  }
}
