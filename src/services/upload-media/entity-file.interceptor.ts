import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  mixin,
  type NestInterceptor,
  type Type,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { S3StorageService } from "./multer-config.service";

export function EntityFileInterceptor(
  entityType: string,
  fieldName: string = "uploadFile",
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    protected filesInterceptor;

    constructor(
      @Inject(S3StorageService) readonly s3StorageService: S3StorageService,
    ) {
      this.filesInterceptor = new (FileInterceptor(
        fieldName,
        this.s3StorageService.multerOptions(entityType),
      ))();
    }

    async intercept(context: ExecutionContext, next: CallHandler) {
      // First, let the file upload interceptor handle the upload
      const result = await this.filesInterceptor.intercept(context, next);

      // Then validate file size
      const request = context.switchToHttp().getRequest();
      if (request.file) {
        this.s3StorageService.validateFileSize(request.file);
      }

      return result;
    }
  }

  return mixin(MixinInterceptor);
}
