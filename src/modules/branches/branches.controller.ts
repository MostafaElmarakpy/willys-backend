import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  Put,
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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { ZoneCheckDto } from './dto/zone-check.dto';
import { ZonesService } from './zones.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/branches')
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly zonesService: ZonesService,
  ) {}

  @Post()
  @Version('1')
  @Roles(UserRole.admin)
  async create(@Body() createBranchDto: CreateBranchDto) {
    const branch = await this.branchesService.create(createBranchDto);
    return createCreatedResponse(branch, 'Branch created successfully');
  }

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAll(
    @Query('status') status?: 'all' | 'active' | 'open',
    @Query() pagination?: PaginationDto,
  ) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    let result: any;

    switch (status) {
      case 'active':
        result = await this.branchesService.findActive(page, limit);
        break;
      case 'open':
        result = await this.branchesService.findOpen(page, limit);
        break;
      default:
        result = await this.branchesService.findAll(page, limit);
    }

    return createSuccessResponse(result, 'Branches retrieved successfully');
  }

  @Get('nearby')
  @Version('1')
  @Roles(UserRole.admin)
  async findNearby(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
  ) {
    const branches = await this.branchesService.findNearby(
      latitude,
      longitude,
      radius,
    );

    return createSuccessResponse(
      branches,
      'Nearby branches retrieved successfully',
    );
  }

  @Post('check-delivery-zone')
  @Version('1')
  @Roles(UserRole.admin)
  async checkDeliveryZone(@Body() zoneCheckDto: ZoneCheckDto) {
    const result = await this.zonesService.checkPointInZone(zoneCheckDto);

    return createSuccessResponse(
      {
        canDeliver: result.isInZone,
        availableBranches: result.matchingBranches,
        recommendedBranch: result.matchingBranches[0]?.branch || null,
      },
      'Zone check completed',
    );
  }

  @Post('find-serving-branch')
  @Version('1')
  @Roles(UserRole.admin)
  async findServingBranch(@Body() zoneCheckDto: ZoneCheckDto) {
    const branch =
      await this.zonesService.findBestBranchForLocation(zoneCheckDto);

    return createSuccessResponse(
      { branch },
      branch ? 'Serving branch found' : 'No serving branch found',
    );
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const branch = await this.branchesService.findOne(id);

    return createSuccessResponse(branch, 'Branch retrieved successfully');
  }

  @Get(':id/stats')
  @Version('1')
  @Roles(UserRole.admin)
  async getBranchStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.branchesService.getBranchStats(id);

    return createSuccessResponse(
      stats,
      'Branch statistics retrieved successfully',
    );
  }

  @Get(':id/zones')
  @Version('1')
  @Roles(UserRole.admin)
  async getBranchZones(@Param('id', ParseUUIDPipe) id: string) {
    const zones = await this.zonesService.findByBranch(id);

    return createSuccessResponse(zones, 'Branch zones retrieved successfully');
  }

  @Put(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    const branch = await this.branchesService.update(id, updateBranchDto);

    return createSuccessResponse(branch, 'Branch updated successfully');
  }

  @Patch(':id/toggle-status')
  @Version('1')
  @Roles(UserRole.admin)
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'active' | 'open',
  ) {
    const branch = await this.branchesService.toggleStatus(id, status);

    return createSuccessResponse(
      branch,
      `Branch ${status} status toggled successfully`,
    );
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.branchesService.remove(id);

    return createSuccessResponse(null, 'Branch deleted successfully');
  }
}
