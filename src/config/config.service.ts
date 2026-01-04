import { Injectable, Logger, NotFoundException } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);
  private config: Record<string, string | number | boolean> = {};
  private requiredKeys = [
    'PORT',
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_NAME',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'DATABASE_SYNCHRONIZE',
    'JWT_ACCESS_TOKEN_EXPIRES_IN',
    'JWT_REFRESH_TOKEN_EXPIRES_IN',
    'JWT_SECRET',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_KEY_ID',
    'S3_BUCKET_NAME',
    'S3_REGION',
    'ROUND_CUBE_HOST',
    'ROUND_CUBE_PORT',
    'ROUND_CUBE_USER',
    'ROUND_CUBE_PASSWORD',
    // 'TOTP_SECRET',
  ];

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const missingKeys = this.requiredKeys.filter((key) => !process.env[key]);
    if (missingKeys.length > 0) {
      this.logger.error(
        `Missing required environment variables: ${missingKeys.join(', ')}`,
      );
      throw new Error(
        `Missing required environment variables: ${missingKeys.join(', ')}`,
      );
    }

    this.config = {
      port: Number(process.env.PORT),
      databaseHost: process.env.DATABASE_HOST!,
      databasePort: Number(process.env.DATABASE_PORT),
      databaseUsername: process.env.DATABASE_USERNAME!,
      databasePassword: process.env.DATABASE_PASSWORD!,
      databaseName: process.env.DATABASE_NAME!,
      databaseSync: process.env.DATABASE_SYNCHRONIZE === 'true',
      jwtSecret: process.env.JWT_SECRET!,
      jwtAccessExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN!,
      jwtRefreshExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN!,
      postgresUser: process.env.POSTGRES_USER!,
      postgresPassword: process.env.POSTGRES_PASSWORD!,
      postgresDB: process.env.POSTGRES_DB!,
      s3AccessKey: process.env.S3_ACCESS_KEY_ID!,
      s3SecretKey: process.env.S3_SECRET_KEY_ID!,
      s3BucketName: process.env.S3_BUCKET_NAME!,
      s3Region: process.env.S3_REGION!,
      roundCubeHost: process.env.ROUND_CUBE_HOST!,
      roundCubePort: Number(process.env.ROUND_CUBE_PORT),
      roundCubeUser: process.env.ROUND_CUBE_USER!,
      roundCubePassword: process.env.ROUND_CUBE_PASSWORD!,
      paymobApiKey: process.env.PAYMOB_API_KEY || '',
      paymobSecretKey: process.env.PAYMOB_SECRET_KEY || '',
      paymobPublicKey: process.env.PAYMOB_PUBLIC_KEY || '',
      paymobCreditCardIntegrationId: process.env.PAYMOB_CREDIT_CARD_INTEGRATION_ID || '',
      paymobIframeId: process.env.PAYMOB_IFRAME_ID || '',
      // totpSecret: process.env.TOTP_SECRET!,
    };

    this.logger.log(
      'Configuration loaded successfully from environment variables',
    );
  }

  get(key: string): string | number | boolean {
    if (!(key in this.config)) {
      this.logger.error(`Configuration key "${key}" not found`);
      throw new NotFoundException(`Configuration key "${key}" not found`);
    }
    return this.config[key];
  }
}
