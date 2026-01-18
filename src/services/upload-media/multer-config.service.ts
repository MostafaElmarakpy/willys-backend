import { extname } from "node:path";
import {
  ChecksumMode,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { BadRequestException, Injectable } from "@nestjs/common";
import * as multerS3 from "multer-s3";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class S3StorageService {
  private readonly s3: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get("s3AccessKey") as string;
    const secretAccessKey = this.configService.get("s3SecretKey") as string;
    const region = this.configService.get("s3Region") as string;
    this.bucketName = this.configService.get("s3BucketName") as string;

    // Skip S3 initialization in test environment
    const isTestEnv = process.env.NODE_ENV === "test";

    if (isTestEnv) {
      // Create a minimal S3 client for test environment (won't be used)
      this.s3 = {} as S3Client;
      return;
    }

    if (!accessKeyId || !secretAccessKey || !region || !this.bucketName) {
      throw new Error("S3StorageService: Missing required S3 configuration");
    }

    this.s3 = new S3Client({
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
      region,
    });

    // Set up CORS rules (non-blocking - log errors instead of throwing)
    this.s3
      .send(
        new PutBucketCorsCommand({
          Bucket: this.bucketName,
          CORSConfiguration: {
            CORSRules: [{ AllowedOrigins: ["*"], AllowedMethods: ["GET"] }],
          },
        }),
      )
      .then(() => {
        console.log("S3 bucket CORS rules configured successfully");
      })
      .catch((err) => {
        console.warn(`Failed to ensure S3 bucket CORS rules: ${err.message}`);
      });
  }

  multerOptions(entityType: string) {
    return {
      storage: multerS3({
        s3: this.s3,
        bucket: this.bucketName,
        acl: "public-read",
        key: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const fileName = `${entityType}/${uniqueSuffix}${extname(file.originalname)}`;
          cb(null, fileName);
        },
        ChecksumMode: ChecksumMode.ENABLED,
      }),
      fileFilter: (_req: any, file: any, cb: any) => {
        const fieldName = file.fieldname;

        try {
          const isImage =
            file.mimetype.match(/\/(jpg|jpeg|png|webp)$/) ||
            file.mimetype === "image/svg+xml";
          const isVideo = file.mimetype.match(
            /^video\/(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/,
          );
          const isPdf = file.mimetype === "application/pdf";

          if (!isImage && !isVideo && !isPdf) {
            cb(
              new BadRequestException(
                `Field '${fieldName}': Only image, video, or PDF files are allowed! Received: ${file.mimetype}`,
              ),
              false,
            );
            return;
          }

          cb(null, true);
        } catch (error) {
          cb(
            new BadRequestException(
              `Field '${fieldName}': File validation error - ${error.message}`,
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // Global max file size (for videos)
        files: 20, // Maximum number of files
      },
    };
  }

  /**
   * Validate file size based on file type
   * @param file - The uploaded file object
   * @returns true if file size is valid, throws BadRequestException if not
   */
  validateFileSize(file: any): boolean {
    const maxSizes = {
      image: 5 * 1024 * 1024, // 5MB for images
      video: 100 * 1024 * 1024, // 100MB for videos
      pdf: 50 * 1024 * 1024, // 50MB for PDFs
    };

    const isImage =
      file.mimetype.match(/\/(jpg|jpeg|png|webp)$/) ||
      file.mimetype === "image/svg+xml";
    const isVideo = file.mimetype.match(
      /^video\/(mp4|webm|ogg|avi|mov|wmv|flv|mkv)$/,
    );
    const isPdf = file.mimetype === "application/pdf";

    let maxSize: number;
    let fileType: string;

    if (isImage) {
      maxSize = maxSizes.image;
      fileType = "image";
    } else if (isVideo) {
      maxSize = maxSizes.video;
      fileType = "video";
    } else if (isPdf) {
      maxSize = maxSizes.pdf;
      fileType = "pdf";
    } else {
      throw new BadRequestException(
        `File '${file.originalname}' has an unsupported file type: ${file.mimetype}`,
      );
    }

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      throw new BadRequestException(
        `File '${file.originalname}' exceeds the maximum size limit of ${maxSizeMB}MB for ${fileType} files.`,
      );
    }

    return true;
  }
}
