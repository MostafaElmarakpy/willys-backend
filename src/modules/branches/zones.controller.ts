import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  Version,
} from "@nestjs/common";
import { Permission } from "../../common/decorators/permissions.decorator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PermissionAction } from "../../common/enums/PermissionAction";
import { PermissionModule } from "../../common/enums/PermissionModule";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import {
  createCreatedResponse,
  createSuccessResponse,
} from "../../common/utils/api-response-wrapper";
import { CreateZoneDto } from "./dto/create-zone.dto";
import { UpdateZoneDto } from "./dto/update-zone.dto";
import { ZoneCheckDto } from "./dto/zone-check.dto";
import { ZonesService } from "./zones.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/zones")
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.CREATE)
  async create(@Body() createZoneDto: CreateZoneDto) {
    const zone = await this.zonesService.create(createZoneDto);
    return createCreatedResponse(zone, "Zone created successfully");
  }

  @Get()
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.READ)
  async findAll(@Query() pagination: PaginationDto) {
    const result = await this.zonesService.findAll(
      pagination.page,
      pagination.limit,
      pagination.sortBy,
      pagination.sortOrder || "DESC",
    );
    return createSuccessResponse(result, "Zones retrieved successfully");
  }

  @Post("check-point")
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.READ)
  async checkPoint(@Body() zoneCheckDto: ZoneCheckDto) {
    const result = await this.zonesService.checkPointInZone(zoneCheckDto);

    return createSuccessResponse(result, "Point check completed");
  }

  @Post("find-branch")
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.READ)
  async findBranchForLocation(@Body() zoneCheckDto: ZoneCheckDto) {
    const branch =
      await this.zonesService.findBestBranchForLocation(zoneCheckDto);

    return createSuccessResponse(
      { branch },
      branch ? "Branch found for location" : "No branch serves this location",
    );
  }

  @Get("branch/:branchId")
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.READ)
  async findByBranch(@Param("branchId", ParseUUIDPipe) branchId: string) {
    const zones = await this.zonesService.findByBranch(branchId);
    return createSuccessResponse(zones, "Branch zones retrieved successfully");
  }

  @Get(":id")
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.READ)
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.findOne(id);
    return createSuccessResponse(zone, "Zone retrieved successfully");
  }

  @Get(":id/stats")
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.VIEW_STATS)
  async getZoneStats(@Param("id", ParseUUIDPipe) id: string) {
    const stats = await this.zonesService.getZoneStats(id);
    return createSuccessResponse(
      stats,
      "Zone statistics retrieved successfully",
    );
  }

  @Put(":id")
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.UPDATE)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    const zone = await this.zonesService.update(id, updateZoneDto);
    return createSuccessResponse(zone, "Zone updated successfully");
  }

  @Patch(":id/toggle-active")
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.TOGGLE_STATUS)
  async toggleActive(@Param("id", ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.toggleActive(id);
    return createSuccessResponse(
      zone,
      "Zone active status toggled successfully",
    );
  }

  @Delete(":id")
  @Version("1")
  @Permission(PermissionModule.ZONES, PermissionAction.DELETE)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.zonesService.remove(id);
    return createSuccessResponse(null, "Zone deleted successfully");
  }
}
