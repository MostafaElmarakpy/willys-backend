import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  HttpStatus,
  Put,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/UserRole';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Zone created successfully',
      data: zone,
    };
  }

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAll() {
    const zones = await this.zonesService.findAll();
    return {
      statusCode: HttpStatus.OK,
      message: 'Zones retrieved successfully',
      data: zones,
    };
  }

  @Post('check-point')
  @Version('1')
  @Roles(UserRole.admin)
  async checkPoint(@Body() zoneCheckDto: ZoneCheckDto) {
    const result = await this.zonesService.checkPointInZone(zoneCheckDto);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Point check completed',
      data: result,
    };
  }

  @Post('find-branch')
  @Version('1')
  @Roles(UserRole.admin)
  async findBranchForLocation(@Body() zoneCheckDto: ZoneCheckDto) {
    const branch = await this.zonesService.findBestBranchForLocation(zoneCheckDto);
    
    return {
      statusCode: HttpStatus.OK,
      message: branch ? 'Branch found for location' : 'No branch serves this location',
      data: { branch },
    };
  }

  @Get('branch/:branchId')
  @Version('1')
  @Roles(UserRole.admin)
  async findByBranch(@Param('branchId', ParseUUIDPipe) branchId: string) {
    const zones = await this.zonesService.findByBranch(branchId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Branch zones retrieved successfully',
      data: zones,
    };
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Zone retrieved successfully',
      data: zone,
    };
  }

  @Get(':id/stats')
  @Version('1')
  @Roles(UserRole.admin)
  async getZoneStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.zonesService.getZoneStats(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Zone statistics retrieved successfully',
      data: stats,
    };
  }

  @Put(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    const zone = await this.zonesService.update(id, updateZoneDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Zone updated successfully',
      data: zone,
    };
  }

  @Patch(':id/toggle-active')
  @Version('1')
  @Roles(UserRole.admin)
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    const zone = await this.zonesService.toggleActive(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Zone active status toggled successfully',
      data: zone,
    };
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.zonesService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Zone deleted successfully',
    };
  }
}