import { IsNotEmpty, IsString } from "class-validator";

export class CreateUploadMediaDto {
  // @Validate(IsFileConstraint)
  media: Express.Multer.File;

  @IsString()
  @IsNotEmpty()
  entityType: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;
}
