import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Branch } from "../../database/entities/branch.entity";
import { Zone } from "../../database/entities/zone.entity";
import { CreateZoneDto } from "./dto/create-zone.dto";
import { UpdateZoneDto } from "./dto/update-zone.dto";
import { ZoneCheckDto } from "./dto/zone-check.dto";

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone) readonly zoneRepository: Repository<Zone>,
    @InjectRepository(Branch) readonly branchRepository: Repository<Branch>,
  ) {}

  async create(createZoneDto: CreateZoneDto): Promise<Zone> {
    // Verify branch exists
    const branch = await this.branchRepository.findOne({
      where: { id: createZoneDto.branchId },
    });

    if (!branch) {
      throw new NotFoundException(
        `Branch with ID ${createZoneDto.branchId} not found`,
      );
    }

    try {
      // Convert GeoJSON polygon to WKT format
      const polygonWkt = this.geoJsonToWkt(createZoneDto.polygon);

      // Insert zone directly using raw SQL to include polygon
      const result = await this.zoneRepository.query(
        `
        INSERT INTO zones (name, "branchId", polygon, "centerLatitude", "centerLongitude", "radiusKm", "isActive", priority, "deliveryFee", "createdAt", "updatedAt")
        VALUES ($1, $2, ST_GeomFromText($3, 4326), $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `,
        [
          createZoneDto.name ? JSON.stringify(createZoneDto.name) : null,
          createZoneDto.branchId,
          polygonWkt,
          createZoneDto.centerLatitude || null,
          createZoneDto.centerLongitude || null,
          createZoneDto.radiusKm || null,
          createZoneDto.isActive ?? true,
          createZoneDto.priority ?? 0,
          createZoneDto.deliveryFee,
        ],
      );

      // Return the zone with relations
      return await this.findOne(result[0].id);
    } catch (error) {
      throw new BadRequestException(`Failed to create zone: ${error.message}`);
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{
    zones: Zone[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const allowedSortFields = ["name", "priority", "createdAt", "updatedAt"];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : "priority";

    let orderConfig: any;
    if (orderField === "name") {
      orderConfig = { name: sortOrder, createdAt: "ASC" };
    } else {
      orderConfig = { [orderField]: sortOrder, createdAt: "ASC" };
    }

    const [zones, total] = await this.zoneRepository.findAndCount({
      relations: ["branch"],
      order: orderConfig,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      zones,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findByBranch(branchId: string): Promise<Zone[]> {
    return this.zoneRepository.find({
      where: { branchId, isActive: true },
      relations: ["branch"],
      order: { priority: "DESC" },
    });
  }

  async findOne(id: string): Promise<Zone> {
    const zone = await this.zoneRepository.findOne({
      where: { id },
      relations: ["branch"],
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return zone;
  }

  async update(id: string, updateZoneDto: UpdateZoneDto): Promise<Zone> {
    const zone = await this.findOne(id);

    try {
      // If polygon is being updated, convert it to WKT
      if (updateZoneDto.polygon) {
        const polygonWkt = this.geoJsonToWkt(updateZoneDto.polygon);

        // Update using raw SQL to handle polygon
        await this.zoneRepository.query(
          `
          UPDATE zones 
          SET name = COALESCE($1, name),
              "branchId" = COALESCE($2, "branchId"),
              polygon = COALESCE(ST_GeomFromText($3, 4326), polygon),
              "centerLatitude" = COALESCE($4, "centerLatitude"),
              "centerLongitude" = COALESCE($5, "centerLongitude"),
              "radiusKm" = COALESCE($6, "radiusKm"),
              "isActive" = COALESCE($7, "isActive"),
              priority = COALESCE($8, priority),
              "deliveryFee" = COALESCE($9, "deliveryFee"),
              "updatedAt" = NOW()
          WHERE id = $10
        `,
          [
            updateZoneDto.name ? JSON.stringify(updateZoneDto.name) : null,
            updateZoneDto.branchId || null,
            polygonWkt,
            updateZoneDto.centerLatitude ?? null,
            updateZoneDto.centerLongitude ?? null,
            updateZoneDto.radiusKm ?? null,
            updateZoneDto.isActive ?? null,
            updateZoneDto.priority ?? null,
            updateZoneDto.deliveryFee ?? null,
            id,
          ],
        );

        return await this.findOne(id);
      } else {
        // If no polygon update, use regular TypeORM save
        Object.assign(zone, updateZoneDto);
        return await this.zoneRepository.save(zone);
      }
    } catch (error) {
      throw new BadRequestException(`Failed to update zone: ${error.message}`);
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
      relations: ["branch"],
      order: { priority: "DESC" },
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
      if (zone.polygon) {
        try {
          const geoJsonPolygon = this.wktToGeoJson(zone.polygon);
          isPointInZone = this.pointInPolygon(
            [longitude, latitude],
            geoJsonPolygon.coordinates[0], // First ring of polygon
          );
        } catch (error) {
          console.warn(`Failed to parse polygon for zone ${zone.id}:`, error);
        }
      }

      // Fallback to radius-based check if polygon check failed
      if (
        !isPointInZone &&
        zone.centerLatitude &&
        zone.centerLongitude &&
        zone.radiusKm
      ) {
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

  async findBestBranchForLocation(
    zoneCheckDto: ZoneCheckDto,
  ): Promise<Branch | null> {
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

      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }

    return inside;
  }

  // Calculate distance using Haversine formula
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

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
        polygonArea: zone.polygon
          ? this.calculatePolygonArea(this.wktToGeoJson(zone.polygon))
          : 0,
        isActive: zone.isActive,
      },
    };
  }

  // Convert GeoJSON polygon to WKT format
  private geoJsonToWkt(polygon: {
    type: "Polygon";
    coordinates: number[][][];
  }): string {
    if (!polygon || polygon.type !== "Polygon") {
      throw new Error("Invalid polygon: must be a GeoJSON Polygon");
    }

    if (
      !polygon.coordinates ||
      !Array.isArray(polygon.coordinates) ||
      polygon.coordinates.length === 0
    ) {
      throw new Error("Invalid polygon: coordinates array is required");
    }

    const coords = polygon.coordinates[0]; // First ring (exterior ring)

    if (!coords || coords.length < 4) {
      throw new Error(
        "Invalid polygon: ring must have at least 4 coordinates (first and last must be the same)",
      );
    }

    // Validate coordinate format [longitude, latitude]
    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i];
      if (!Array.isArray(coord) || coord.length !== 2) {
        throw new Error(
          `Invalid coordinate at index ${i}: must be [longitude, latitude]`,
        );
      }

      const [lng, lat] = coord;
      if (typeof lng !== "number" || typeof lat !== "number") {
        throw new Error(
          `Invalid coordinate at index ${i}: longitude and latitude must be numbers`,
        );
      }

      if (lng < -180 || lng > 180) {
        throw new Error(
          `Invalid longitude ${lng} at index ${i}: must be between -180 and 180`,
        );
      }

      if (lat < -90 || lat > 90) {
        throw new Error(
          `Invalid latitude ${lat} at index ${i}: must be between -90 and 90`,
        );
      }
    }

    const wktCoords = coords
      .map((coord) => `${coord[0]} ${coord[1]}`)
      .join(", ");
    return `POLYGON((${wktCoords}))`;
  }

  // Convert WKT polygon to GeoJSON format
  private wktToGeoJson(wkt: string | any): {
    type: "Polygon";
    coordinates: number[][][];
  } {
    // If already GeoJSON (TypeORM returns PostGIS as GeoJSON objects), return it
    if (typeof wkt === "object" && wkt !== null && wkt.type === "Polygon") {
      return wkt;
    }

    // If string, parse as WKT format
    if (typeof wkt === "string") {
      const match = wkt.match(/POLYGON\(\(([^)]+)\)\)/);
      if (!match) {
        throw new Error("Invalid WKT polygon format");
      }

      const coordString = match[1];
      const coords = coordString.split(", ").map((pair) => {
        const [x, y] = pair.split(" ").map(Number);
        return [x, y];
      });

      return {
        type: "Polygon",
        coordinates: [coords],
      };
    }

    throw new Error(
      "Invalid polygon format: must be either WKT string or GeoJSON object",
    );
  }

  private calculatePolygonArea(polygon: { coordinates: number[][][] }): number {
    if (!polygon || !polygon.coordinates || !polygon.coordinates[0]) {
      return 0;
    }

    const coords = polygon.coordinates[0];
    let area = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
    }

    return Math.abs(area / 2);
  }
}
