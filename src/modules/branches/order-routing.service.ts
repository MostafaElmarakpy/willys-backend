import { Injectable, BadRequestException } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { BranchesService } from './branches.service';
import { Branch } from '../../database/entities/branch.entity';

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface OrderRoutingResult {
  canDeliver: boolean;
  assignedBranch: Branch | null;
  alternativeBranches: Branch[];
  message: string;
  estimatedDeliveryTime?: number;
  deliveryFee?: number;
}

@Injectable()
export class OrderRoutingService {
  constructor(
    private readonly zonesService: ZonesService,
    private readonly branchesService: BranchesService,
  ) {}

  async routeOrder(
    deliveryLocation: DeliveryLocation,
  ): Promise<OrderRoutingResult> {
    try {
      const zoneCheck = await this.zonesService.checkPointInZone({
        latitude: deliveryLocation.latitude,
        longitude: deliveryLocation.longitude,
      });

      if (!zoneCheck.isInZone || zoneCheck.matchingBranches.length === 0) {
        return {
          canDeliver: false,
          assignedBranch: null,
          alternativeBranches: [],
          message: 'Sorry, we do not serve this area yet.',
        };
      }

      // Filter out closed or inactive branches
      const availableBranches = zoneCheck.matchingBranches.filter(
        (item) => item.branch.isActive && item.branch.isOpen,
      );

      if (availableBranches.length === 0) {
        return {
          canDeliver: false,
          assignedBranch: null,
          alternativeBranches: [],
          message: 'All branches serving this area are currently closed.',
        };
      }

      // Get the best branch (highest priority, shortest distance)
      const bestBranch = availableBranches[0].branch;

      // Get alternative branches (up to 3)
      const alternatives = availableBranches
        .slice(1, 4)
        .map((item) => item.branch);

      return {
        canDeliver: true,
        assignedBranch: bestBranch,
        alternativeBranches: alternatives,
        message: `Order will be handled by ${bestBranch.name}`,
        estimatedDeliveryTime: bestBranch.estimatedDeliveryTime,
        deliveryFee: bestBranch.deliveryFee,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to route order: ${error.message}`);
    }
  }

  async validateDeliveryLocation(deliveryLocation: DeliveryLocation): Promise<{
    isValid: boolean;
    branch: Branch | null;
    message: string;
  }> {
    const routingResult = await this.routeOrder(deliveryLocation);

    return {
      isValid: routingResult.canDeliver,
      branch: routingResult.assignedBranch,
      message: routingResult.message,
    };
  }

  async findNearestBranches(
    latitude: number,
    longitude: number,
    limit: number = 5,
  ): Promise<Branch[]> {
    // Find all active branches and calculate distances
    const branches = await this.branchesService.findOpen();

    const branchesWithDistance = branches.map((branch) => ({
      ...branch,
      distance: this.calculateDistance(
        latitude,
        longitude,
        branch.latitude,
        branch.longitude,
      ),
    }));

    // Sort by distance and return limited results
    return branchesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(({ distance, ...branch }) => branch as Branch);
  }

  async getBranchWorkload(branchId: string): Promise<{
    branchId: string;
    currentLoad: 'low' | 'medium' | 'high';
    estimatedWaitTime: number;
    canAcceptOrders: boolean;
  }> {
    // This is a placeholder for workload calculation
    // In a real implementation, you would calculate based on:
    // - Current pending orders
    // - Available delivery staff
    // - Kitchen capacity
    // - Historical data

    return {
      branchId,
      currentLoad: 'low',
      estimatedWaitTime: 30,
      canAcceptOrders: true,
    };
  }

  async optimizeDeliveryRoute(
    branchId: string,
    deliveryLocations: DeliveryLocation[],
  ): Promise<{
    optimizedRoute: DeliveryLocation[];
    totalDistance: number;
    estimatedTime: number;
  }> {
    // This is a placeholder for delivery route optimization
    // In a real implementation, you would use algorithms like:
    // - Traveling Salesman Problem (TSP) solver
    // - Google Maps Directions API
    // - Custom routing algorithms

    const branch = await this.branchesService.findOne(branchId);

    // Simple nearest neighbor approach for demonstration
    const optimizedRoute = [...deliveryLocations];
    let totalDistance = 0;

    // Calculate total distance (simplified)
    for (let i = 0; i < optimizedRoute.length; i++) {
      const from =
        i === 0
          ? { latitude: branch.latitude, longitude: branch.longitude }
          : optimizedRoute[i - 1];
      const to = optimizedRoute[i];

      totalDistance += this.calculateDistance(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude,
      );
    }

    return {
      optimizedRoute,
      totalDistance,
      estimatedTime: Math.round(totalDistance * 3), // Assume 3 minutes per km
    };
  }

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
}
