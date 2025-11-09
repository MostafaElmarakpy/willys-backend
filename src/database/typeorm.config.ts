import { ConfigService, registerAs } from '@nestjs/config';
import { ActionByUserSubscriber } from 'src/common/subscribers/action-by-user.subscriber';
import { LocaleSubscriber } from 'src/common/subscribers/locale.subscriber';
import { DataSource, DataSourceOptions } from 'typeorm';

let databaseConfig: any = null;

async function initializeDatabaseConfig() {
  const configService = new ConfigService();

  if (
    !configService.get('databaseHost') ||
    !configService.get('databasePort') ||
    !configService.get('databaseUsername') ||
    !configService.get('databasePassword') ||
    !configService.get('databaseName')
  ) {
    console.error('Missing required database configuration');
    process.exit(1);
  }

  const {
    databaseHost,
    databasePort,
    databaseUsername,
    databasePassword,
    databaseName,
  } =
    configService.get('databaseHost') ||
    !configService.get('databasePort') ||
    !configService.get('databaseUsername') ||
    !configService.get('databasePassword') ||
    !configService.get('databaseName');

  databaseConfig = {
    type: 'postgres',
    host: `${databaseHost}`,
    port: parseInt(`${databasePort}`),
    username: `${databaseUsername}`,
    password: `${databasePassword}`,
    database: `${databaseName}`,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: ['dist/database/migrations/*.js'],
    subscribers: [ActionByUserSubscriber, LocaleSubscriber],
    autoLoadEntities: true,
    logging: `${process.env.NODE_ENV}` === 'development',
    logger: 'advanced-console',
    cli: {
      entitiesDir: 'dist/**/entities',
      migrationsDir: 'dist/database/migrations',
      subscribersDir: 'dist/subscribers',
    },
    synchronize: `${process.env.NODE_ENV}` === 'development' ? true : false,
  };
}

export async function getDatabaseConfig() {
  if (!databaseConfig) {
    await initializeDatabaseConfig();
  }
  return databaseConfig;
}

export default registerAs(
  'databaseConfig',
  async () => await getDatabaseConfig(),
);

export const connectionSource = (async () => {
  const config = await getDatabaseConfig();
  return new DataSource(config as DataSourceOptions);
})();
