import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  Version,
} from "@nestjs/common";
import { Permission } from "src/common/decorators/permissions.decorator";
import { PermissionAction } from "src/common/enums/PermissionAction";
import { PermissionModule } from "src/common/enums/PermissionModule";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import {
  createCreatedResponse,
  createSuccessResponse,
} from "src/common/utils/api-response-wrapper";
import { CategoriesService } from "./categories.service";
import { CategoryFilterDto } from "./dto/category/category-filter.dto";
import { CreateCategoryDto } from "./dto/category/create-category.dto";
import { ReorderCategoriesDto } from "./dto/category/reorder-categories.dto";
import { UpdateCategoryDto } from "./dto/category/update-category.dto";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/menu/categories")
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Version("1")
  @Permission(PermissionModule.CATEGORIES, PermissionAction.READ)
  async findAll(@Query() query: CategoryFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy,
      sortOrder = "ASC",
    } = query;
    const categories = await this.categoriesService.findAll(
      page,
      limit,
      search,
      isActive,
      sortBy,
      sortOrder,
    );
    return createSuccessResponse(
      categories,
      "Categories retrieved successfully",
    );
  }

  @Post()
  @Version("1")
  @Permission(PermissionModule.CATEGORIES, PermissionAction.CREATE)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Request() req: any,
  ) {
    const category = await this.categoriesService.create(
      createCategoryDto,
      req.user.id,
    );
    return createCreatedResponse(category, "Category created successfully");
  }

  @Patch("reorder")
  @Version("1")
  @Permission(PermissionModule.CATEGORIES, PermissionAction.UPDATE)
  async reorder(@Body() reorderDto: ReorderCategoriesDto) {
    const result = await this.categoriesService.reorderCategories(reorderDto);
    return createSuccessResponse(result, "Categories reordered successfully");
  }

  @Get("active")
  @Version("1")
  @Permission(PermissionModule.CATEGORIES, PermissionAction.READ)
  async findActiveCategories() {
    const categories = await this.categoriesService.findActiveCategories();
    return createSuccessResponse(
      categories,
      "Active categories retrieved successfully",
    );
  }

  @Get(":id")
  @Version("1")
  @Permission(PermissionModule.CATEGORIES, PermissionAction.READ)
  async findOne(@Param("id") id: string) {
    const category = await this.categoriesService.findOne(id);
    return createSuccessResponse(category, "Category retrieved successfully");
  }

  @Patch(":id")
  @Version("1")
  @Permission(PermissionModule.CATEGORIES, PermissionAction.UPDATE)
  async update(
    @Param("id") id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req: any,
  ) {
    const category = await this.categoriesService.update(
      id,
      updateCategoryDto,
      req.user.id,
    );
    return createSuccessResponse(category, "Category updated successfully");
  }

  @Delete(":id")
  @Version("1")
  @Permission(PermissionModule.CATEGORIES, PermissionAction.DELETE)
  async remove(@Param("id") id: string) {
    await this.categoriesService.remove(id);
    return createSuccessResponse(null, "Category deleted successfully");
  }
}
