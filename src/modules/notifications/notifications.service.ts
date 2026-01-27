import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { NotificationType } from "src/common/enums/NotificationType";
import { UserRole } from "src/common/enums/UserRole";
import { AdminFcmToken } from "src/database/entities/admin-fcm-token.entity";
import { AdminNotification } from "src/database/entities/admin-notification.entity";
import { AdminNotificationPreferences } from "src/database/entities/admin-notification-preferences.entity";
import { User } from "src/database/entities/user.entity";
import { Repository } from "typeorm";
import { NotificationFilterDto } from "./dto/notification-filter.dto";
import { RegisterFcmTokenDto } from "./dto/register-fcm-token.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { FcmService } from "./fcm.service";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(AdminFcmToken)
    private readonly fcmTokenRepository: Repository<AdminFcmToken>,
    @InjectRepository(AdminNotification)
    private readonly notificationRepository: Repository<AdminNotification>,
    @InjectRepository(AdminNotificationPreferences)
    private readonly preferencesRepository: Repository<AdminNotificationPreferences>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly fcmService: FcmService,
  ) {}

  // ============ FCM Token Management ============

  async registerToken(
    userId: string,
    dto: RegisterFcmTokenDto,
  ): Promise<AdminFcmToken> {
    // Check if token already exists for this user
    const existing = await this.fcmTokenRepository.findOne({
      where: { userId, token: dto.token },
    });

    if (existing) {
      existing.lastUsedAt = new Date();
      existing.isActive = true;
      return this.fcmTokenRepository.save(existing);
    }

    // Deactivate old tokens with same deviceId if provided
    if (dto.deviceId) {
      await this.fcmTokenRepository.update(
        { userId, deviceId: dto.deviceId },
        { isActive: false },
      );
    }

    const token = this.fcmTokenRepository.create({
      userId,
      token: dto.token,
      deviceId: dto.deviceId,
      deviceType: dto.deviceType || "web",
      userAgent: dto.userAgent,
      lastUsedAt: new Date(),
    });

    return this.fcmTokenRepository.save(token);
  }

  async removeToken(userId: string, token: string): Promise<void> {
    await this.fcmTokenRepository.update(
      { userId, token },
      { isActive: false },
    );
  }

  async removeInvalidToken(token: string): Promise<void> {
    await this.fcmTokenRepository.delete({ token });
  }

  // ============ Notification Preferences ============

  async getPreferences(userId: string): Promise<AdminNotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({ userId });
      await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<AdminNotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({ userId, ...dto });
    } else {
      Object.assign(preferences, dto);
    }

    return this.preferencesRepository.save(preferences);
  }

  // ============ Send Notifications ============

  async sendNotificationToAdmins(
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    targetUserId?: string,
  ): Promise<void> {
    // Early exit if database is not connected
    try {
      const connection = this.notificationRepository.manager.connection;
      if (!connection?.isInitialized) {
        this.logger.debug(
          "Database connection not initialized, skipping notification",
        );
        return;
      }
    } catch {
      this.logger.debug(
        "Unable to check database connection, skipping notification",
      );
      return;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create notification record
        const notification = this.notificationRepository.create({
          type,
          title,
          message,
          data,
          targetUserId,
        });
        await this.notificationRepository.save(notification);

        // Get admin users with their tokens and preferences
        const adminsWithTokens = await this.getAdminsWithTokens(
          type,
          targetUserId,
        );

        if (adminsWithTokens.length === 0) {
          this.logger.debug("No admins to notify");
          return;
        }

        // Collect all tokens
        const allTokens = adminsWithTokens.flatMap((admin) => admin.tokens);

        if (allTokens.length > 0) {
          const fcmData: Record<string, string> = {
            type,
            notificationId: notification.id,
            ...this.serializeData(data),
          };

          const { success, failed, tokensToRemove } =
            await this.fcmService.sendToTokens(
              allTokens,
              { title, body: message },
              fcmData,
            );

          // Remove invalid tokens
          for (const token of tokensToRemove) {
            try {
              await this.removeInvalidToken(token);
            } catch (removeError) {
              this.logger.warn(
                `Failed to remove invalid token: ${removeError.message}`,
              );
            }
          }

          this.logger.log(
            `Notification sent: ${success.length} success, ${failed.length} failed`,
          );
        }
        return; // Success, exit the function
      } catch (error) {
        lastError = error;

        // Driver not connected means database is shutting down - don't retry
        const isDriverDisconnected = error.message?.includes(
          "Driver not Connected",
        );

        if (isDriverDisconnected) {
          this.logger.debug(
            "Database driver disconnected, skipping notification",
          );
          return; // Exit early, no need to retry or log errors
        }

        // Other connection errors are transient - retry them
        const isTransientError =
          error.message?.includes("Connection terminated") ||
          error.message?.includes("ECONNREFUSED") ||
          error.message?.includes("ETIMEDOUT") ||
          error.message?.includes("Connection lost") ||
          error.message?.includes("socket hang up") ||
          error.code === "ECONNRESET" ||
          error.code === "ENOTFOUND" ||
          error.name === "ConnectionIsNotSetError";

        if (isTransientError && attempt < maxRetries) {
          this.logger.warn(
            `Database connection error on attempt ${attempt}/${maxRetries}: ${error.message}, retrying in ${attempt * 1000}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
          continue;
        }

        this.logger.error(
          `Failed to send notification (attempt ${attempt}/${maxRetries}): ${error.message}`,
          error.stack,
        );

        if (attempt === maxRetries) {
          break;
        }
      }
    }

    if (lastError) {
      // Connection terminated during retry is a warn, not an error
      const isConnectionTerminated = lastError.message?.includes(
        "Connection terminated",
      );

      if (isConnectionTerminated) {
        this.logger.warn(
          `Database connection terminated, notification not sent. Type: ${type}, Title: ${title}`,
        );
      } else {
        this.logger.error(
          `All retry attempts exhausted for notification. Type: ${type}, Title: ${title}`,
        );
      }
    }
  }

  private serializeData(data?: Record<string, any>): Record<string, string> {
    if (!data) return {};
    const serialized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] =
        typeof value === "string" ? value : JSON.stringify(value);
    }
    return serialized;
  }

  private async getAdminsWithTokens(
    type: NotificationType,
    targetUserId?: string,
  ): Promise<Array<{ userId: string; tokens: string[] }>> {
    const preferenceField = this.getPreferenceFieldForType(type);

    // Get all admin users with their preferences and tokens in a single query
    const adminQuery = this.userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.adminNotificationPreferences", "preferences")
      .leftJoinAndSelect(
        "user.adminFcmTokens",
        "tokens",
        "tokens.isActive = :isActive",
        { isActive: true },
      )
      .where("user.role IN (:...roles)", {
        roles: [UserRole.admin],
      })
      .andWhere("user.deletedAt IS NULL");

    if (targetUserId) {
      adminQuery.andWhere("user.id = :targetUserId", { targetUserId });
    }

    const admins = await adminQuery.getMany();

    const adminsWithTokens: Array<{ userId: string; tokens: string[] }> = [];

    for (const admin of admins) {
      const preferences = admin.adminNotificationPreferences;

      // If no preferences exist or push is enabled and this notification type is enabled
      const shouldSend =
        !preferences ||
        (preferences.pushEnabled && preferences[preferenceField] !== false);

      if (!shouldSend) {
        continue;
      }

      // Get tokens from the joined data
      const tokens = admin.adminFcmTokens?.map((t) => t.token) || [];

      if (tokens.length > 0) {
        adminsWithTokens.push({
          userId: admin.id,
          tokens,
        });
      }
    }

    return adminsWithTokens;
  }

  private getPreferenceFieldForType(
    type: NotificationType,
  ): keyof AdminNotificationPreferences {
    const mapping: Record<
      NotificationType,
      keyof AdminNotificationPreferences
    > = {
      [NotificationType.ORDER_NEW]: "orderNew",
      [NotificationType.ORDER_STATUS_CHANGED]: "orderStatusChanged",
      [NotificationType.USER_REGISTERED]: "userRegistered",
      [NotificationType.PAYMENT_SUCCESS]: "paymentSuccess",
      [NotificationType.PAYMENT_FAILED]: "paymentFailed",
      [NotificationType.PAYMENT_REFUNDED]: "paymentRefunded",
    };
    return mapping[type];
  }

  // ============ Notification History ============

  async getNotifications(
    userId: string,
    filterDto: NotificationFilterDto,
  ): Promise<{
    notifications: AdminNotification[];
    total: number;
    unreadCount: number;
  }> {
    const { page = 1, limit = 20, type, isRead } = filterDto;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder("notification")
      .where("notification.deletedAt IS NULL")
      .andWhere(
        "(notification.targetUserId IS NULL OR notification.targetUserId = :userId)",
        { userId },
      );

    if (type) {
      queryBuilder.andWhere("notification.type = :type", { type });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere("notification.isRead = :isRead", { isRead });
    }

    queryBuilder
      .orderBy("notification.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [notifications, total] = await queryBuilder.getManyAndCount();

    // Get unread count
    const unreadCount = await this.notificationRepository
      .createQueryBuilder("notification")
      .where("notification.deletedAt IS NULL")
      .andWhere(
        "(notification.targetUserId IS NULL OR notification.targetUserId = :userId)",
        { userId },
      )
      .andWhere("notification.isRead = false")
      .getCount();

    return { notifications, total, unreadCount };
  }

  async markAsRead(_userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update()
      .set({ isRead: true, readAt: new Date() })
      .where("(targetUserId IS NULL OR targetUserId = :userId)", { userId })
      .andWhere("isRead = false")
      .execute();
  }
}
