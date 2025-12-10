import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from '../../database/entities/zone.entity';
import { Branch } from '../../database/entities/branch.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { ZoneCheckDto } from './dto/zone-check.dto';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
  ) {}

  async create(createZoneDto: CreateZoneDto): Promise<Zone> {
    // Verify branch exists
    const branch = await this.branchRepository.findOne({
      where: { id: createZoneDto.branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${createZoneDto.branchId} not found`);
    }

    try {
      const zone = this.zoneRepository.create({
        ...createZoneDto,
        isActive: createZoneDto.isActive ?? true,
        priority: createZoneDto.priority ?? 0,
      });
      
      return await this.zoneRepository.save(zone);
    } catch (error) {
      throw new BadRequestException('Failed to create zone: ' + error.message);
    }
  }

  async findAll(): Promise<Zone[]> {
    return this.zoneRepository.find({
      relations: ['branch'],
      order: { priority: 'DESC', createdAt: 'ASC' },
    });
  }

  async findByBranch(branchId: string): Promise<Zone[]> {
    return this.zoneRepository.find({
      where: { branchId, isActive: true },
      relations: ['branch'],
      order: { priority: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Zone> {
    const zone = await this.zoneRepository.findOne({
      where: { id },
      relations: ['branch'],
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return zone;
  }

  async update(id: string, updateZoneDto: UpdateZoneDto): Promise<Zone> {
    const zone = await this.findOne(id);
    
    Object.assign(zone, updateZoneDto);
    
    try {
      return await this.zoneRepository.save(zone);
    } catch (error) {
      throw new BadRequestException('Failed to update zone: ' + error.message);
    }
  }

  async remove(id: string): Promise<void> {
    const zone = await this.findOne(id);
    await this.zoneRepository.remove(zone);
  }

  async toggleActive(id: string): Promise<Zone> {
    const zone = await this.findOne(id);
    zone.isActive = !zone.isActive;
    return await this.zoneRepository.save(zone);
  }

  async checkPointInZone(zoneCheckDto: ZoneCheckDto): Promise<{
    isInZone: boolean;
    matchingBranches: Array<{
      branch: Branch;
      zone: Zone;
      distance?: number;
    }>;
  }> {
    const { latitude, longitude } = zoneCheckDto;
    
    // Find all active zones with their branches
    const zones = await this.zoneRepository.find({
      where: { isActive: true },
      relations: ['branch'],
      order: { priority: 'DESC' },
    });

    const matchingBranches: Array<{
      branch: Branch;
      zone: Zone;
      distance?: number;
    }> = [];

    for (const zone of zones) {
      // Skip if branch is not active or open
      if (!zone.branch.isActive || !zone.branch.isOpen) {
        continue;
      }

      let isPointInZone = false;

      // Check polygon-based zone
      if (zone.polygon && zone.polygon.coordinates) {
        isPointInZone = this.pointInPolygon(
          [longitude, latitude],
          zone.polygon.coordinates[0], // First ring of polygon
        );
      }

      // Fallback to radius-based check if polygon check failed
      if (!isPointInZone && zone.centerLatitude && zone.centerLongitude && zone.radiusKm) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          zone.centerLatitude,
          zone.centerLongitude,
        );
        isPointInZone = distance <= zone.radiusKm;
      }

      if (isPointInZone) {
        // Calculate distance to branch for sorting
        const distanceToBranch = this.calculateDistance(
          latitude,
          longitude,
          zone.branch.latitude,
          zone.branch.longitude,
        );

        matchingBranches.push({
          branch: zone.branch,
          zone,
          distance: distanceToBranch,
        });
      }
    }

    // Sort by priority first, then by distance
    matchingBranches.sort((a, b) => {
      if (a.zone.priority !== b.zone.priority) {
        return b.zone.priority - a.zone.priority; // Higher priority first
      }
      return (a.distance || 0) - (b.distance || 0); // Closer distance first
    });

    return {
      isInZone: matchingBranches.length > 0,
      matchingBranches,
    };
  }

  async findBestBranchForLocation(zoneCheckDto: ZoneCheckDto): Promise<Branch | null> {
    const result = await this.checkPointInZone(zoneCheckDto);
    
    if (result.matchingBranches.length > 0) {
      return result.matchingBranches[0].branch;
    }
    
    return null;
  }

  // Point-in-polygon algorithm (Ray casting algorithm)
  private pointInPolygon(point: number[], polygon: number[][]): boolean {
    const x = point[0];
    const y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];

      if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  // Calculate distance using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getZoneStats(id: string) {
    const zone = await this.findOne(id);
    
    // TODO: Add order statistics when orders module is created
    return {
      zone,
      stats: {
        // ordersCount: 0,
        // todaysOrders: 0,
        polygonArea: this.calculatePolygonArea(zone.polygon),
        isActive: zone.isActive,
      },
    };
  }

  private calculatePolygonArea(polygon: { coordinates: number[][][] }): number {
    if (!polygon || !polygon.coordinates || !polygon.coordinates[0]) {
      return 0;
    }

    const coords = polygon.coordinates[0];
    let area = 0;
    
    for (let i = 0; i < coords.length - 1; i++) {
      area += (coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1]);
    }
    
    return Math.abs(area / 2);
  }
}