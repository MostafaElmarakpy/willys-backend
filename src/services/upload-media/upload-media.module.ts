import { Module } from '@nestjs/common';
import { UploadMediaService } from './upload-media.service';
import { UploadMediaController } from './upload-media.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadMedia } from './entities/upload-media.entity';
import { User } from 'src/database/entities/user.entity';
import { ConfigModule } from 'src/config/config.module';
import { S3StorageService } from './multer-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([UploadMedia, User]), ConfigModule],
  controllers: [UploadMediaController],
  providers: [UploadMediaService, S3StorageService],
  exports: [UploadMediaService, S3StorageService],
})
export class UploadMediaModule {}
