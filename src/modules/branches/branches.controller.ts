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
  HttpStatus,
  Put,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/UserRole';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { ZoneCheckDto } from './dto/zone-check.dto';
import { ZonesService } from './zones.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
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
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Branch created successfully',
      data: branch,
    };
  }

  @Get()
  @Version('1')
  @Roles(UserRole.admin)
  async findAll(@Query('status') status?: 'all' | 'active' | 'open') {
    let branches: any;
    
    switch (status) {
      case 'active':
        branches = await this.branchesService.findActive();
        break;
      case 'open':
        branches = await this.branchesService.findOpen();
        break;
      default:
        branches = await this.branchesService.findAll();
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Branches retrieved successfully',
      data: branches,
    };
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

    return {
      statusCode: HttpStatus.OK,
      message: 'Nearby branches retrieved successfully',
      data: branches,
    };
  }

  @Post('check-delivery-zone')
  @Version('1')
  @Roles(UserRole.admin)
  async checkDeliveryZone(@Body() zoneCheckDto: ZoneCheckDto) {
    const result = await this.zonesService.checkPointInZone(zoneCheckDto);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Zone check completed',
      data: {
        canDeliver: result.isInZone,
        availableBranches: result.matchingBranches,
        recommendedBranch: result.matchingBranches[0]?.branch || null,
      },
    };
  }

  @Post('find-serving-branch')
  @Version('1')
  @Roles(UserRole.admin)
  async findServingBranch(@Body() zoneCheckDto: ZoneCheckDto) {
    const branch = await this.zonesService.findBestBranchForLocation(zoneCheckDto);
    
    return {
      statusCode: HttpStatus.OK,
      message: branch ? 'Serving branch found' : 'No serving branch found',
      data: { branch },
    };
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const branch = await this.branchesService.findOne(id);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Branch retrieved successfully',
      data: branch,
    };
  }

  @Get(':id/stats')
  @Version('1')
  @Roles(UserRole.admin)
  async getBranchStats(@Param('id', ParseUUIDPipe) id: string) {
    const stats = await this.branchesService.getBranchStats(id);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Branch statistics retrieved successfully',
      data: stats,
    };
  }

  @Get(':id/zones')
  @Version('1')
  @Roles(UserRole.admin)
  async getBranchZones(@Param('id', ParseUUIDPipe) id: string) {
    const zones = await this.zonesService.findByBranch(id);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Branch zones retrieved successfully',
      data: zones,
    };
  }

  @Put(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    const branch = await this.branchesService.update(id, updateBranchDto);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Branch updated successfully',
      data: branch,
    };
  }

  @Patch(':id/toggle-status')
  @Version('1')
  @Roles(UserRole.admin)
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: 'active' | 'open',
  ) {
    const branch = await this.branchesService.toggleStatus(id, status);
    
    return {
      statusCode: HttpStatus.OK,
      message: `Branch ${status} status toggled successfully`,
      data: branch,
    };
  }

  @Delete(':id')
  @Version('1')
  @Roles(UserRole.admin)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.branchesService.remove(id);
    
    return {
      statusCode: HttpStatus.OK,
      message: 'Branch deleted successfully',
    };
  }
}