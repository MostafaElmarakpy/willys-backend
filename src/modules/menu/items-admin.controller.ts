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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
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
import { EntityFilesInterceptor } from "src/services/upload-media/entity-files.interceptor";
import { CreateItemDto } from "./dto/item/create-item.dto";
import { ItemFilterDto } from "./dto/item/item-filter.dto";
import { UpdateItemDto } from "./dto/item/update-item.dto";
import { ItemsService } from "./items.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/menu/items")
export class ItemsAdminController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @Version("1")
  @Permission(PermissionModule.ITEMS, PermissionAction.READ)
  async findAll(@Query() filterDto: ItemFilterDto) {
    const items = await this.itemsService.findAll(filterDto);
    return createSuccessResponse(items, "Items retrieved successfully");
  }

  @Post()
  @Version("1")
  @Permission(PermissionModule.ITEMS, PermissionAction.CREATE)
  @UseInterceptors(
    EntityFilesInterceptor("menu-items", [{ name: "image", maxCount: 1 }]),
  )
  async create(
    @UploadedFiles() files: { [fieldName: string]: Express.Multer.File[] },
    @Body() createItemDto: CreateItemDto,
    @Request() req: any,
  ) {
    const item = await this.itemsService.create(
      createItemDto,
      req.user.id,
      files,
    );
    return createCreatedResponse(item, "Item created successfully");
  }

  @Get(":id")
  @Version("1")
  @Permission(PermissionModule.ITEMS, PermissionAction.READ)
  async findOne(@Param("id") id: string) {
    const item = await this.itemsService.findOne(id);
    return createSuccessResponse(item, "Item retrieved successfully");
  }

  @Patch(":id")
  @Version("1")
  @Permission(PermissionModule.ITEMS, PermissionAction.UPDATE)
  @UseInterceptors(
    EntityFilesInterceptor("menu-items", [{ name: "image", maxCount: 1 }]),
  )
  async update(
    @Param("id") id: string,
    @UploadedFiles() files: { [fieldName: string]: Express.Multer.File[] },
    @Body() updateItemDto: UpdateItemDto,
    @Request() req: any,
  ) {
    const item = await this.itemsService.update(
      id,
      updateItemDto,
      req.user.id,
      files,
    );
    return createSuccessResponse(item, "Item updated successfully");
  }

  @Delete(":id")
  @Version("1")
  @Permission(PermissionModule.ITEMS, PermissionAction.DELETE)
  async remove(@Param("id") id: string) {
    await this.itemsService.remove(id);
    return createSuccessResponse(null, "Item deleted successfully");
  }

  @Get("category/:categoryId")
  @Version("1")
  @Permission(PermissionModule.ITEMS, PermissionAction.READ)
  async findByCategory(@Param("categoryId") categoryId: string) {
    const items = await this.itemsService.findByCategory(categoryId);
    return createSuccessResponse(
      items,
      "Category items retrieved successfully",
    );
  }

  @Post(":id/duplicate")
  @Version("1")
  @Permission(PermissionModule.ITEMS, PermissionAction.DUPLICATE)
  async duplicate(@Param("id") id: string, @Request() req: any) {
    const item = await this.itemsService.duplicate(id, req.user.id);
    return createCreatedResponse(item, "Item duplicated successfully");
  }

  @Patch(":id/archive")
  @Version("1")
  @Permission(PermissionModule.ITEMS, PermissionAction.ARCHIVE)
  async archive(@Param("id") id: string, @Request() req: any) {
    const item = await this.itemsService.archiveItem(id, req.user.id);
    return createSuccessResponse(item, "Item archived successfully");
  }
}
