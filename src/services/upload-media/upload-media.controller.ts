import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { createSuccessResponse } from 'src/common/utils/api-response-wrapper';
import { CreateUploadMediaDto } from './dto/create-upload-media.dto';
import { EntityFileInterceptor } from './entity-file.interceptor';

@UseGuards(JwtAuthGuard)
@Controller('/upload-media')
export class UploadMediaController {
  constructor() {}

  @Post()
  @Version('1')
  @UseInterceptors(EntityFileInterceptor('media', 'uploadFile'))
  async uploadFile(@Body() body: CreateUploadMediaDto) {
    return createSuccessResponse({}, 'File uploaded successfully');
  }
}
