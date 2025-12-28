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
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/UserRole';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import {
  createSuccessResponse,
  createCreatedResponse,
} from 'src/common/utils/api-response-wrapper';
import { CreateBundleDto } from './dto/bundle/create-bundle.dto';
import { UpdateBundleDto } from './dto/bundle/update-bundle.dto';
import { BundleFilterDto } from './dto/bundle/bundle-filter.dto';
import { BundlesService } from './bundles.service';
import { EntityFilesInterceptor } from 'src/services/upload-media/entity-files.interceptor';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/menu/bundles')
export class BundlesAdminController {
  constructor(private readonly bundlesService: BundlesService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAll(@Query() filterDto: BundleFilterDto) {
    const bundles = await this.bundlesService.findAll(filterDto);
    return createSuccessResponse(bundles, 'Bundles retrieved successfully');
  }

  @Post()
  @Version('1')
  @Roles(UserRole.admin)
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
  @Roles(UserRole.admin)
  async findOne(@Param('id') id: string) {
    const bundle = await this.bundlesService.findOne(id);
    return createSuccessResponse(bundle, 'Bundle retrieved successfully');
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.admin)
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
  @Roles(UserRole.admin)
  async remove(@Param('id') id: string) {
    await this.bundlesService.remove(id);
    return createSuccessResponse(null, 'Bundle deleted successfully');
  }

  @Get('category/:categoryId')
  @Version('1')
  @Roles(UserRole.admin)
  async findByCategory(@Param('categoryId') categoryId: string) {
    const bundles = await this.bundlesService.findByCategory(categoryId);
    return createSuccessResponse(
      bundles,
      'Category bundles retrieved successfully',
    );
  }

  @Post(':id/duplicate')
  @Version('1')
  @Roles(UserRole.admin)
  async duplicate(@Param('id') id: string, @Request() req: any) {
    const bundle = await this.bundlesService.duplicate(id, req.user.id);
    return createCreatedResponse(bundle, 'Bundle duplicated successfully');
  }

  @Patch(':id/archive')
  @Version('1')
  @Roles(UserRole.admin)
  async archive(@Param('id') id: string, @Request() req: any) {
    const bundle = await this.bundlesService.archiveBundle(id, req.user.id);
    return createSuccessResponse(bundle, 'Bundle archived successfully');
  }
}
