import { HttpStatus, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { useContainer, ValidationError } from 'class-validator';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { LocaleInterceptor } from './common/interceptor/locale.interceptor';
import { createErrorResponse } from './common/utils/api-response-wrapper';
import { ConfigService } from './config/config.service';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  const configService = app.get(ConfigService);

  const isProduction = process.env.NODE_ENV === 'production';
  const trustProxy = isProduction ? 'loopback, linklocal, uniquelocal' : true;

  app.set('trust proxy', trustProxy);

  app.use(express.json({ limit: '150mb' }));
  app.use(express.urlencoded({ limit: '150mb', extended: true }));

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/health',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = errors.reduce(
          (acc: Record<string, string[]>, err) => {
            acc[err.property] = err.constraints
              ? Object.values(err.constraints)
              : ['Invalid value'];
            return acc;
          },
          {},
        );

        return createErrorResponse('Validation failed', HttpStatus.BAD_REQUEST);
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
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen((configService.get('port') as number) ?? 8080);
}
bootstrap();
