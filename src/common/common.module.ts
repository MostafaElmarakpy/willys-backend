import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AuthenticationModule } from 'src/authentication/authentication.module';
import { JwtStrategy } from 'src/authentication/strategy/jwt.strategy';
import { LocalStrategy } from 'src/authentication/strategy/local.strategy';
import { UsersModule } from 'src/modules/users/users.module';
import { ActionByUserSubscriber } from './subscribers/action-by-user.subscriber';
import { IsUniqueConstraint } from './validator/is-unique.constraint';
import { ClsModule } from 'nestjs-cls';
import { ConfigService } from 'src/config/config.service';
import { MailService } from './mail/mail.service';
import { PaginationModule } from './pagination/pagination.module';
import { OtpModule } from './otp/opt.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const config = {
          secret: configService.get('jwtSecret') as string,
          signOptions: {
            expiresIn: configService.get('jwtAccessExpiration') as string,
          },
        } as JwtModuleOptions;
        return {
          ...config,
        };
      },
    }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    AuthenticationModule,
    UsersModule,
    ConfigModule,
    PaginationModule,
    OtpModule,
  ],
  providers: [
    LocalStrategy,
    JwtStrategy,
    ActionByUserSubscriber,
    IsUniqueConstraint,
    MailService,
  ],
  exports: [ActionByUserSubscriber],
})
export class CommonModule {}
