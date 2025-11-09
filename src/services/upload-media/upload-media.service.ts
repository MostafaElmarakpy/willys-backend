import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadMedia } from './entities/upload-media.entity';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class UploadMediaService {
  private s3: S3Client;
  private readonly logger = new Logger(UploadMediaService.name);

  constructor(
    @InjectRepository(UploadMedia)
    private filesRepository: Repository<UploadMedia>,
    private configService: ConfigService,
  ) {
    const accessKeyId = configService.get('s3AccessKey') as string;
    const secretAccessKey = configService.get('s3SecretKey') as string;
    const region = configService.get('s3Region') as string;

    this.s3 = new S3Client({
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
    });

    this.s3
      .send(
        new PutBucketCorsCommand({
          Bucket: this.configService.get('s3BucketName') as string,
          CORSConfiguration: {
            CORSRules: [{ AllowedOrigins: ['*'], AllowedMethods: ['GET'] }],
          },
        }),
      )
      .catch((err) => {
        throw new BadRequestException(
          'Failed to ensure S3 bucket CORS rules',
          err,
        );
      });
  }

  async saveFileData(
    file: any,
    entityType: string,
    entityId: string,
    isFileRequired: boolean = true,
  ): Promise<UploadMedia | undefined> {
    if (isFileRequired && !file) {
      throw new Error('File is required');
    }

    // Save metadata in DB
    const newFile = this.filesRepository.create({
      url: file.location, // S3 File URL
      filename: file.key,
      path: file.key, // S3 object key
      mimetype: file.mimetype,
      size: file.size,
      entityType,
      entityId,
    });

    return await this.filesRepository.save(newFile);
  }

  async saveOneFile(
    file: Express.Multer.File[] | Express.Multer.File | undefined,
    entityType: string,
    entityId: string,
    isFileRequired: boolean = true,
  ): Promise<UploadMedia | undefined> {
    if (Array.isArray(file)) {
      file = file[0];
    }
    if (!file) {
      return undefined;
    }

    return await this.saveFileData(file, entityType, entityId, isFileRequired);
  }

  async saveFiles(
    file: Express.Multer.File[] | Express.Multer.File | undefined,
    entityType: string,
    entityId: string,
    count: number = 1,
    isFileRequired: boolean = true,
  ): Promise<UploadMedia | UploadMedia[] | undefined> {
    if (!file) {
      return undefined;
    } else if (Array.isArray(file)) {
      const files = await Promise.all(
        file.map((f) =>
          this.saveFileData(f, entityType, entityId, isFileRequired),
        ),
      );
      return files.filter((f) => f !== undefined) as UploadMedia[];
    } else {
      const savedFile = await this.saveFileData(
        file,
        entityType,
        entityId,
        isFileRequired,
      );
      return savedFile;
    }
  }

  private extractS3KeyFromUrl(url: string): string | null {
    try {
      const parsedUrl = new URL(url);
      const bucketName = this.configService.get('s3BucketName') as string;

      if (parsedUrl.hostname.startsWith(`${bucketName}.s3`)) {
        return parsedUrl.pathname.substring(1); // Remove leading slash
      }

      if (
        parsedUrl.hostname.includes('s3') &&
        parsedUrl.hostname.includes('amazonaws.com')
      ) {
        const pathParts = parsedUrl.pathname
          .split('/')
          .filter((part) => part.length > 0);
        if (pathParts.length >= 2 && pathParts[0] === bucketName) {
          return pathParts.slice(1).join('/');
        }
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to parse URL: ${url}`, error);
      return null;
    }
  }

  async deleteFile(
    identifier: string | undefined,
    removeFromDb: boolean = true,
  ): Promise<boolean> {
    if (!identifier) {
      this.logger.warn('No identifier provided for file deletion');
      return false;
    }

    try {
      let s3Key: string | null = null;
      let fileRecord: UploadMedia | null = null;

      if (identifier.startsWith('http')) {
        s3Key = this.extractS3KeyFromUrl(identifier);
        if (!s3Key) {
          this.logger.error(`Could not extract S3 key from URL: ${identifier}`);
          return false;
        }

        if (removeFromDb) {
          fileRecord = await this.filesRepository.findOne({
            where: { url: identifier },
          });
        }
      } else {
        if (identifier.includes('/')) {
          s3Key = identifier;

          if (removeFromDb) {
            fileRecord = await this.filesRepository.findOne({
              where: { path: identifier },
            });
          }
        } else {
          if (removeFromDb) {
            fileRecord = await this.filesRepository.findOne({
              where: { id: identifier },
            });

            if (fileRecord) {
              s3Key = fileRecord.path;
            }
          }
        }
      }

      if (!s3Key) {
        this.logger.error(
          `Could not determine S3 key for identifier: ${identifier}`,
        );
        return false;
      }

      // Delete from S3
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.configService.get('s3BucketName') as string,
          Key: s3Key,
        }),
      );

      this.logger.log(`Successfully deleted file from S3: ${s3Key}`);

      // Delete from database if requested and record exists
      if (removeFromDb && fileRecord) {
        await this.filesRepository.remove(fileRecord);
        this.logger.log(
          `Successfully deleted file record from database: ${fileRecord.id}`,
        );
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to delete file with identifier: ${identifier}`,
        error,
      );
      return false;
    }
  }

  /**
   * Delete multiple files
   * @param identifiers - Array of file IDs, S3 keys, or S3 URLs
   * @param removeFromDb - Whether to remove records from database
   */
  async deleteFiles(
    identifiers: string[],
    removeFromDb: boolean = true,
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = await Promise.allSettled(
      identifiers.map((id) => this.deleteFile(id, removeFromDb)),
    );

    const success: string[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        success.push(identifiers[index]);
      } else {
        failed.push(identifiers[index]);
      }
    });

    return { success, failed };
  }

  /**
   * Delete files by entity
   * @param entityType - The entity type
   * @param entityId - The entity ID
   */
  async deleteFilesByEntity(
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    try {
      const files = await this.filesRepository.find({
        where: { entityType, entityId },
      });

      if (files.length === 0) {
        return true;
      }

      const identifiers = files.map((file) => file.id);
      const { failed } = await this.deleteFiles(identifiers, true);

      return failed.length === 0;
    } catch (error) {
      this.logger.error(
        `Failed to delete files for entity ${entityType}:${entityId}`,
        error,
      );
      return false;
    }
  }
}
