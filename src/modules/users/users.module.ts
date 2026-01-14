import { Module } from "@nestjs/common";
import { JwtModule, type JwtModuleOptions } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailService } from "src/common/mail/mail.service";
import { ConfigModule } from "src/config/config.module";
import { ConfigService } from "src/config/config.service";
import { User } from "src/database/entities/user.entity";
import { UploadMediaModule } from "src/services/upload-media/upload-media.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UsersAdminController } from "./users-admin.controller";
import { UsersAdminService } from "./users-admin.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UploadMediaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const config = {
          secret: configService.get("jwtSecret") as string,
          signOptions: {
            expiresIn: configService.get("jwtAccessExpiration") as string,
          },
        } as JwtModuleOptions;
        return {
          ...config,
        };
      },
    }),
    ConfigModule,
  ],
  controllers: [UsersController, UsersAdminController],
  providers: [UsersService, UsersAdminService, MailService],
  exports: [UsersService, UsersAdminService],
})
export class UsersModule {}
