import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as admin from "firebase-admin";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: admin.app.App | null = null;
  private isInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const projectId = this.configService.get("firebaseProjectId") as string;
      const clientEmail = this.configService.get(
        "firebaseClientEmail",
      ) as string;
      const privateKey = this.configService.get("firebasePrivateKey") as string;

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          "Firebase credentials not configured. FCM notifications disabled.",
        );
        return;
      }

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.isInitialized = true;
      this.logger.log("Firebase Admin SDK initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Firebase Admin SDK", error);
    }
  }

  isConfigured(): boolean {
    return this.isInitialized;
  }

  async sendToToken(
    token: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<{ success: boolean; shouldRemoveToken: boolean }> {
    if (!this.isInitialized || !this.firebaseApp) {
      this.logger.warn("FCM not initialized, skipping notification");
      return { success: false, shouldRemoveToken: false };
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: data || {},
        webpush: {
          notification: {
            icon: "/favicon.ico",
            badge: "/notification-badge.png",
            requireInteraction: true,
          },
          fcmOptions: {
            link: data?.link || "/",
          },
        },
      };

      await this.firebaseApp.messaging().send(message);
      this.logger.debug(
        `Notification sent to token: ${token.substring(0, 20)}...`,
      );
      return { success: true, shouldRemoveToken: false };
    } catch (error: any) {
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        this.logger.warn(`Invalid FCM token: ${token.substring(0, 20)}...`);
        return { success: false, shouldRemoveToken: true };
      }
      this.logger.error(`Failed to send notification: ${error.message}`);
      return { success: false, shouldRemoveToken: false };
    }
  }

  async sendToTokens(
    tokens: string[],
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<{
    success: string[];
    failed: string[];
    tokensToRemove: string[];
  }> {
    const results = await Promise.allSettled(
      tokens.map((token) =>
        this.sendToToken(token, notification, data).then((result) => ({
          token,
          ...result,
        })),
      ),
    );

    const success: string[] = [];
    const failed: string[] = [];
    const tokensToRemove: string[] = [];

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        if (result.value.success) {
          success.push(result.value.token);
        } else {
          failed.push(result.value.token);
          if (result.value.shouldRemoveToken) {
            tokensToRemove.push(result.value.token);
          }
        }
      } else {
        // Promise rejected - shouldn't happen but handle it
        failed.push("");
      }
    });

    return { success, failed, tokensToRemove };
  }
}
