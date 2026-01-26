import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  Version,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import { createSuccessResponse } from "src/common/utils/api-response-wrapper";
import { NotificationFilterDto } from "./dto/notification-filter.dto";
import { RegisterFcmTokenDto } from "./dto/register-fcm-token.dto";
import { UpdateNotificationPreferencesDto } from "./dto/update-notification-preferences.dto";
import { NotificationsService } from "./notifications.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("fcm-token")
  @Version("1")
  async registerFcmToken(
    @Request() req: any,
    @Body() dto: RegisterFcmTokenDto,
  ) {
    const token = await this.notificationsService.registerToken(
      req.user.id,
      dto,
    );
    return createSuccessResponse(token, "FCM token registered successfully");
  }

  @Delete("fcm-token/:token")
  @Version("1")
  async removeFcmToken(@Request() req: any, @Param("token") token: string) {
    await this.notificationsService.removeToken(req.user.id, token);
    return createSuccessResponse(null, "FCM token removed successfully");
  }

  @Get("preferences")
  @Version("1")
  async getPreferences(@Request() req: any) {
    const preferences = await this.notificationsService.getPreferences(
      req.user.id,
    );
    return createSuccessResponse(
      preferences,
      "Preferences retrieved successfully",
    );
  }

  @Patch("preferences")
  @Version("1")
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const preferences = await this.notificationsService.updatePreferences(
      req.user.id,
      dto,
    );
    return createSuccessResponse(
      preferences,
      "Preferences updated successfully",
    );
  }

  @Get()
  @Version("1")
  async getNotifications(
    @Request() req: any,
    @Query() filterDto: NotificationFilterDto,
  ) {
    const result = await this.notificationsService.getNotifications(
      req.user.id,
      filterDto,
    );
    return createSuccessResponse(
      result,
      "Notifications retrieved successfully",
    );
  }

  @Patch(":id/read")
  @Version("1")
  async markAsRead(@Request() req: any, @Param("id") id: string) {
    await this.notificationsService.markAsRead(req.user.id, id);
    return createSuccessResponse(null, "Notification marked as read");
  }

  @Patch("read-all")
  @Version("1")
  async markAllAsRead(@Request() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return createSuccessResponse(null, "All notifications marked as read");
  }
}
