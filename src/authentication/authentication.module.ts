import { Module } from "@nestjs/common";
import { JwtModule, type JwtModuleOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MailService } from "src/common/mail/mail.service";
import { ConfigModule } from "src/config/config.module";
import { ConfigService } from "src/config/config.service";
import { UsersModule } from "src/modules/users/users.module";
import { UploadMediaModule } from "src/services/upload-media/upload-media.module";
import { AccessToken } from "../database/entities/access-token.entity";
import { ResetPasswordToken } from "../database/entities/reset-password-token.entity";
import { AuthenticationController } from "./authentication.controller";
import { AuthenticationService } from "./authentication.service";
import { JwtStrategy } from "./strategy/jwt.strategy";
import { LocalStrategy } from "./strategy/local.strategy";

@Module({
  imports: [
    UsersModule,
    PassportModule,
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
    TypeOrmModule.forFeature([ResetPasswordToken, AccessToken]),
    ConfigModule,
    UploadMediaModule,
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, LocalStrategy, JwtStrategy, MailService],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
