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
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/UserRole';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import {
  createSuccessResponse,
  createCreatedResponse,
} from 'src/common/utils/api-response-wrapper';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateVariantDto } from './dto/variant/create-variant.dto';
import { UpdateVariantDto } from './dto/variant/update-variant.dto';
import { CreateVariantValueDto } from './dto/variant/create-variant-value.dto';
import { UpdateVariantValueDto } from './dto/variant/update-variant-value.dto';
import { VariantsService } from './variants.service';

interface VariantQuery extends PaginationDto {
  search?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/menu/variants')
export class VariantsAdminController {
  constructor(private readonly variantsService: VariantsService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAllVariants(@Query() query: VariantQuery) {
    const { page = 1, limit = 10, search } = query;
    const variants = await this.variantsService.findAllVariants(
      page,
      limit,
      search,
    );
    return createSuccessResponse(variants, 'Variants retrieved successfully');
  }

  @Post()
  @Version('1')
  @Roles(UserRole.admin)
  async createVariant(
    @Body() createVariantDto: CreateVariantDto,
    @Request() req: any,
  ) {
    const variant = await this.variantsService.createVariant(
      createVariantDto,
      req.user.id,
    );
    return createCreatedResponse(variant, 'Variant created successfully');
  }

  @Get('active')
  @Version('1')
  @Roles(UserRole.admin)
  async findActiveVariants() {
    const variants = await this.variantsService.findActiveVariants();
    return createSuccessResponse(
      variants,
      'Active variants retrieved successfully',
    );
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOneVariant(@Param('id') id: string) {
    const variant = await this.variantsService.findOneVariant(id);
    return createSuccessResponse(variant, 'Variant retrieved successfully');
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async updateVariant(
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto,
    @Request() req: any,
  ) {
    const variant = await this.variantsService.updateVariant(
      id,
      updateVariantDto,
      req.user.id,
    );
    return createSuccessResponse(variant, 'Variant updated successfully');
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async removeVariant(@Param('id') id: string) {
    await this.variantsService.removeVariant(id);
    return createSuccessResponse(null, 'Variant deleted successfully');
  }

  @Post('values')
  @Version('1')
  @Roles(UserRole.admin)
  async createVariantValue(
    @Body() createVariantValueDto: CreateVariantValueDto,
    @Request() req: any,
  ) {
    const variantValue = await this.variantsService.createVariantValue(
      createVariantValueDto,
      req.user.id,
    );
    return createCreatedResponse(
      variantValue,
      'Variant value created successfully',
    );
  }

  @Get(':variantId/values')
  @Version('1')
  @Roles(UserRole.admin)
  async findVariantValues(@Param('variantId') variantId: string) {
    const variantValues =
      await this.variantsService.findVariantValues(variantId);
    return createSuccessResponse(
      variantValues,
      'Variant values retrieved successfully',
    );
  }

  @Get('values/:id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOneVariantValue(@Param('id') id: string) {
    const variantValue = await this.variantsService.findOneVariantValue(id);
    return createSuccessResponse(
      variantValue,
      'Variant value retrieved successfully',
    );
  }

  @Patch('values/:id')
  @Version('1')
  @Roles(UserRole.admin)
  async updateVariantValue(
    @Param('id') id: string,
    @Body() updateVariantValueDto: UpdateVariantValueDto,
    @Request() req: any,
  ) {
    const variantValue = await this.variantsService.updateVariantValue(
      id,
      updateVariantValueDto,
      req.user.id,
    );
    return createSuccessResponse(
      variantValue,
      'Variant value updated successfully',
    );
  }

  @Delete('values/:id')
  @Version('1')
  @Roles(UserRole.admin)
  async removeVariantValue(@Param('id') id: string) {
    await this.variantsService.removeVariantValue(id);
    return createSuccessResponse(null, 'Variant value deleted successfully');
  }
}
