import { registerAs } from '@nestjs/config';
import { ActionByUserSubscriber } from 'src/common/subscribers/action-by-user.subscriber';
import { LocaleSubscriber } from 'src/common/subscribers/locale.subscriber';
import { ConfigService } from 'src/config/config.service';
import { DataSource, DataSourceOptions } from 'typeorm';

let databaseConfig: any = null;

async function initializeDatabaseConfig() {
  const configService = new ConfigService();

  databaseConfig = {
    type: 'postgres',
    host: configService.get('databaseHost') as string,
    port: configService.get('databasePort') as number,
    username: configService.get('databaseUsername') as string,
    password: configService.get('databasePassword') as string,
    database: configService.get('databaseName') as string,
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
    synchronize: configService.get('databaseSync') as boolean,
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
