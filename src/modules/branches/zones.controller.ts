import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/UserRole';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  createSuccessResponse,
  createCreatedResponse,
} from '../../common/utils/api-response-wrapper';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneCheckDto } from './dto/zone-check.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Post()
  @Version('1')
  @Roles(UserRole.admin)
  async create(@Body() createZoneDto: CreateZoneDto) {
    const zone = await this.zonesService.create(createZoneDto);
    return createCreatedResponse(zone, 'Zone created successfully');
  }

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAll(@Query() pagination: PaginationDto) {
    const result = await this.zonesService.findAll(
      pagination.page,
      pagination.limit,
    );
    return createSuccessResponse(result, 'Zones retrieved successfully');
  }

  @Post('check-point')
  @Version('1')
  @Roles(UserRole.admin)
  async checkPoint(@Body() zoneCheckDto: ZoneCheckDto) {
    const result = await this.zonesService.checkPointInZone(zoneCheckDto);

    return createSuccessResponse(result, 'Point check completed');
  }

  @Post('find-branch')
  @Version('1')
  @Roles(UserRole.admin)
  async findBranchForLocation(@Body() zoneCheckDto: ZoneCheckDto) {
    const branch =
      await this.zonesService.findBestBranchForLocation(zoneCheckDto);

    return createSuccessResponse(
      { branch },
      branch ? 'Branch found for location' : 'No branch serves this location',
    );
  }

  @Get('branch/:branchId')
  @Version('1')
  @Roles(UserRole.admin)
  async findByBranch(
    @Param('branchId', ParseUUIDPipe) branchId: string,
  ) {
    const zones = await this.zonesService.findByBranch(branchId);
    return createSuccessResponse(zones, 'Branch zones retrieved successfully');
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.findOne(id);
    return createSuccessResponse(zone, 'Zone retrieved successfully');
  }

  @Get(':id/stats')
  @Version('1')
  @Roles(UserRole.admin)
  async getZoneStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.zonesService.getZoneStats(id);
    return createSuccessResponse(
      stats,
      'Zone statistics retrieved successfully',
    );
  }

  @Put(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    const zone = await this.zonesService.update(id, updateZoneDto);
    return createSuccessResponse(zone, 'Zone updated successfully');
  }

  @Patch(':id/toggle-active')
  @Version('1')
  @Roles(UserRole.admin)
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.toggleActive(id);
    return createSuccessResponse(
      zone,
      'Zone active status toggled successfully',
    );
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.zonesService.remove(id);
    return createSuccessResponse(null, 'Zone deleted successfully');
  }
}
