import * as path from "node:path";
import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TerminusModule } from "@nestjs/terminus";
import { ThrottlerModule } from "@nestjs/throttler";
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from "nestjs-i18n";
import { AuthenticationModule } from "./authentication/authentication.module";
import { CommonModule } from "./common/common.module";
import { MailService } from "./common/mail/mail.service";
import { AppLoggerMiddleware } from "./common/middleware/app-log.middleware";
import { ClsMiddleware } from "./common/middleware/async-context.middleware";
import { LoggerMiddleware } from "./common/middleware/log.middleware";
import { LocaleSubscriber } from "./common/subscribers/locale.subscriber";
import { YcI18nService } from "./common/yc-i18n/yc-i18n.service";
import { DatabaseModule } from "./database/database.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { BranchMenuModule } from "./modules/branch-menu/branch-menu.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { CartModule } from "./modules/cart/cart.module";
import { DiscountsModule } from "./modules/discounts/discounts.module";
import { HealthModule } from "./modules/health/health.module";
import { MenuModule } from "./modules/menu/menu.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { RolesModule } from "./modules/roles/roles.module";
import { UsersModule } from "./modules/users/users.module";
import { UploadMediaModule } from "./services/upload-media/upload-media.module";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, "..", "public"),
    }),
    I18nModule.forRoot({
      fallbackLanguage: "",
      loaderOptions: {
        path: path.join(__dirname, "/locales/"),
        watch: process.env.NODE_ENV !== "production",
      },
      typesOutputPath: path.join(
        __dirname,
        "../src/generated/i18n.generated.ts",
      ),
      resolvers: [
        new QueryResolver(["lang"]),
        AcceptLanguageResolver,
        new HeaderResolver([
          "x-locale",
          "x-language",
          "x-lang",
          "Accept-Language",
        ]),
      ],
    }),
    TerminusModule,
    DatabaseModule,
    CommonModule,
    AuthenticationModule,
    UsersModule,
    BranchesModule,
    MenuModule,
    BranchMenuModule,
    HealthModule,
    DiscountsModule,
    UploadMediaModule,
    PaymentsModule,
    RolesModule,
    AddressesModule,
    CartModule,
    OrdersModule,
  ],
  providers: [LocaleSubscriber, YcI18nService, MailService],
  exports: [LocaleSubscriber, YcI18nService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware, AppLoggerMiddleware, ClsMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
