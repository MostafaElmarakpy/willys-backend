import { ValidationPipe, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { useContainer, type ValidationError } from "class-validator";
import * as express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { I18nValidationExceptionFilter, I18nValidationPipe } from "nestjs-i18n";
import { AppModule } from "./app.module";
import { ValidationErrorFactory } from "./common/factories/validation-error.factory";
import { LocaleInterceptor } from "./common/interceptor/locale.interceptor";
import { ConfigService } from "./config/config.service";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
    prefix: "api/v",
  });

  const configService = app.get(ConfigService);

  const isProduction = process.env.NODE_ENV === "production";

  const trustProxy = isProduction ? "loopback, linklocal, uniquelocal" : 1;

  app.set("trust proxy", trustProxy);

  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: {
        error: "Too many requests from this IP, please try again later.",
        statusCode: 429,
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === "/health",
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        return ValidationErrorFactory.createValidationException(errors);
      },
    }),
  );

  app.useGlobalPipes(new I18nValidationPipe());
  app.useGlobalFilters(
    new I18nValidationExceptionFilter({
      detailedErrors: true,
    }),
  );

  app.useGlobalInterceptors(new LocaleInterceptor());
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  await app.listen((configService.get("port") as number) ?? 8080);
}
bootstrap();
