import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActionByUserSubscriber } from "src/common/subscribers/action-by-user.subscriber";
import { LocaleSubscriber } from "src/common/subscribers/locale.subscriber";
import { ConfigModule } from "src/config/config.module";
import { ConfigService } from "src/config/config.service";
import { DataSourceOptions } from "typeorm";

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const config = {
          type: "postgres",
          host: configService.get("databaseHost") as string,
          port: parseInt(configService.get("databasePort") as string, 10),
          username: configService.get("databaseUsername") as string,
          password: configService.get("databasePassword") as string,
          database: configService.get("databaseName") as string,
          entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
          migrations: ["dist/database/migrations/*.js"],
          subscribers: [ActionByUserSubscriber, LocaleSubscriber],
          autoLoadEntities: true,
          logging: process.env.NODE_ENV === "development",
          logger: "advanced-console",
          cli: {
            entitiesDir: "dist/**/entities",
            migrationsDir: "dist/database/migrations",
            subscribersDir: "dist/subscribers",
          },
          synchronize: false,
        } as DataSourceOptions;

        return {
          ...config,
        };
      },
    }),
    ConfigModule,
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
