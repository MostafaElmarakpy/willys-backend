import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Permission } from 'src/common/decorators/permissions.decorator';
import { PermissionModule } from 'src/common/enums/PermissionModule';
import { PermissionAction } from 'src/common/enums/PermissionAction';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import {
  createSuccessResponse,
  createCreatedResponse,
} from 'src/common/utils/api-response-wrapper';
import { CreateBundleDto } from './dto/bundle/create-bundle.dto';
import { UpdateBundleDto } from './dto/bundle/update-bundle.dto';
import { BundleFilterDto } from './dto/bundle/bundle-filter.dto';
import { BundlesService } from './bundles.service';
import { EntityFilesInterceptor } from 'src/services/upload-media/entity-files.interceptor';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/menu/bundles')
export class BundlesAdminController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Get()
  @Version('1')
  @Permission(PermissionModule.BUNDLES, PermissionAction.READ)
  async findAll(@Query() filterDto: BundleFilterDto) {
    const bundles = await this.bundlesService.findAll(filterDto);
    return createSuccessResponse(bundles, 'Bundles retrieved successfully');
  }

  @Post()
  @Version('1')
  @Permission(PermissionModule.BUNDLES, PermissionAction.CREATE)
  @UseInterceptors(
    EntityFilesInterceptor('menu-bundles', [{ name: 'image', maxCount: 1 }]),
  )
  async create(
    @UploadedFiles() files: { [fieldName: string]: Express.Multer.File[] },
    @Body() createBundleDto: CreateBundleDto,
    @Request() req: any,
  ) {
    const bundle = await this.bundlesService.create(
      createBundleDto,
      req.user.id,
      files,
    );
    return createCreatedResponse(bundle, 'Bundle created successfully');
  }

  @Get(':id')
  @Version('1')
  @Permission(PermissionModule.BUNDLES, PermissionAction.READ)
  async findOne(@Param('id') id: string) {
    const bundle = await this.bundlesService.findOne(id);
    return createSuccessResponse(bundle, 'Bundle retrieved successfully');
  }

  @Patch(':id')
  @Version('1')
  @Permission(PermissionModule.BUNDLES, PermissionAction.UPDATE)
  @UseInterceptors(
    EntityFilesInterceptor('menu-bundles', [{ name: 'image', maxCount: 1 }]),
  )
  async update(
    @UploadedFiles() files: { [fieldName: string]: Express.Multer.File[] },
    @Param('id') id: string,
    @Body() updateBundleDto: UpdateBundleDto,
    @Request() req: any,
  ) {
    const bundle = await this.bundlesService.update(
      id,
      updateBundleDto,
      req.user.id,
      files,
    );
    return createSuccessResponse(bundle, 'Bundle updated successfully');
  }

  @Delete(':id')
  @Version('1')
  @Permission(PermissionModule.BUNDLES, PermissionAction.DELETE)
  async remove(@Param('id') id: string) {
    await this.bundlesService.remove(id);
    return createSuccessResponse(null, 'Bundle deleted successfully');
  }

  @Get('category/:categoryId')
  @Version('1')
  @Permission(PermissionModule.BUNDLES, PermissionAction.READ)
  async findByCategory(@Param('categoryId') categoryId: string) {
    const bundles = await this.bundlesService.findByCategory(categoryId);
    return createSuccessResponse(
      bundles,
      'Category bundles retrieved successfully',
    );
  }

  @Post(':id/duplicate')
  @Version('1')
  @Permission(PermissionModule.BUNDLES, PermissionAction.DUPLICATE)
  async duplicate(@Param('id') id: string, @Request() req: any) {
    const bundle = await this.bundlesService.duplicate(id, req.user.id);
    return createCreatedResponse(bundle, 'Bundle duplicated successfully');
  }

  @Patch(':id/archive')
  @Version('1')
  @Permission(PermissionModule.BUNDLES, PermissionAction.ARCHIVE)
  async archive(@Param('id') id: string, @Request() req: any) {
    const bundle = await this.bundlesService.archiveBundle(id, req.user.id);
    return createSuccessResponse(bundle, 'Bundle archived successfully');
  }
}
