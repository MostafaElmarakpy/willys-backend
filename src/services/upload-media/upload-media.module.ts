import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "src/config/config.module";
import { User } from "src/database/entities/user.entity";
import { UploadMedia } from "./entities/upload-media.entity";
import { S3StorageService } from "./multer-config.service";
import { UploadMediaController } from "./upload-media.controller";
import { UploadMediaService } from "./upload-media.service";

@Module({
  imports: [TypeOrmModule.forFeature([UploadMedia, User]), ConfigModule],
  controllers: [UploadMediaController],
  providers: [UploadMediaService, S3StorageService],
  exports: [UploadMediaService, S3StorageService],
})
export class UploadMediaModule {}
