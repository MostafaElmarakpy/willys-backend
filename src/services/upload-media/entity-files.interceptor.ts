import {
  CallHandler,
  ExecutionContext,
  Inject,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { S3StorageService } from './multer-config.service';

export function EntityFilesInterceptor(
  entityType: string,
  uploadFields: Array<{ name: string; maxCount?: number }>,
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    protected fileFieldsInterceptor;

    constructor(
      @Inject(S3StorageService)
      private readonly s3StorageService: S3StorageService,
    ) {
      this.fileFieldsInterceptor = new (FileFieldsInterceptor(
        uploadFields,
        this.s3StorageService.multerOptions(entityType),
      ))();
    }

    async intercept(context: ExecutionContext, next: CallHandler) {
      // First, let the file upload interceptor handle the upload
      const result = await this.fileFieldsInterceptor.intercept(context, next);

      // Then validate file sizes
      const request = context.switchToHttp().getRequest();
      if (request.files) {
        try {
          Object.values(request.files).forEach((fileArray: any[]) => {
            if (Array.isArray(fileArray)) {
              fileArray.forEach((file) => {
                this.s3StorageService.validateFileSize(file);
              });
            } else if (fileArray) {
              this.s3StorageService.validateFileSize(fileArray);
            }
          });
        } catch (error) {
          throw error;
        }
      }

      return result;
    }
  }

  return mixin(MixinInterceptor);
}
