import { Test, type TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { OrderRoutingService } from "./order-routing.service";
import { ZonesService } from "./zones.service";
import { BranchesService } from "./branches.service";

describe("OrderRoutingService", () => {
  let service: OrderRoutingService;
  let zonesService: jest.Mocked<ZonesService>;
  let branchesService: jest.Mocked<BranchesService>;

  const mockBranchId = "branch-123";
  const mockDeliveryLocation = {
    latitude: 30.0444,
    longitude: 31.2357,
    address: "123 Test Street",
  };

  const mockBranch = {
    id: mockBranchId,
    name: { en: "Test Branch", ar: "فرع اختبار" },
    latitude: 30.0444,
    longitude: 31.2357,
    isActive: true,
    isOpen: true,
    estimatedDeliveryTime: 30,
  };

  const mockZone = {
    id: "zone-123",
    name: { en: "Zone 1", ar: "المنطقة 1" },
    branchId: mockBranchId,
    deliveryFee: 15,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderRoutingService,
        {
          provide: ZonesService,
          useValue: {
            checkPointInZone: jest.fn(),
          },
        },
        {
          provide: BranchesService,
          useValue: {
            findOpen: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderRoutingService>(OrderRoutingService);
    zonesService = module.get(ZonesService);
    branchesService = module.get(BranchesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("routeOrder", () => {
    it("should return canDeliver true when location is in zone", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: true,
        matchingBranches: [{ branch: mockBranch, zone: mockZone }],
      } as any);

      const result = await service.routeOrder(mockDeliveryLocation);

      expect(result.canDeliver).toBe(true);
      expect(result.assignedBranch).toEqual(mockBranch);
      expect(result.deliveryFee).toBe(mockZone.deliveryFee);
    });

    it("should return canDeliver false when location is not in any zone", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: false,
        matchingBranches: [],
      } as any);

      const result = await service.routeOrder(mockDeliveryLocation);

      expect(result.canDeliver).toBe(false);
      expect(result.assignedBranch).toBeNull();
      expect(result.message).toBe("Sorry, we do not serve this area yet.");
    });

    it("should return canDeliver false when all branches are closed", async () => {
      const closedBranch = { ...mockBranch, isOpen: false };
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: true,
        matchingBranches: [{ branch: closedBranch, zone: mockZone }],
      } as any);

      const result = await service.routeOrder(mockDeliveryLocation);

      expect(result.canDeliver).toBe(false);
      expect(result.message).toBe("All branches serving this area are currently closed.");
    });

    it("should return alternative branches when multiple are available", async () => {
      const branch2 = { ...mockBranch, id: "branch-456" };
      const branch3 = { ...mockBranch, id: "branch-789" };
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: true,
        matchingBranches: [
          { branch: mockBranch, zone: mockZone },
          { branch: branch2, zone: mockZone },
          { branch: branch3, zone: mockZone },
        ],
      } as any);

      const result = await service.routeOrder(mockDeliveryLocation);

      expect(result.canDeliver).toBe(true);
      expect(result.alternativeBranches).toHaveLength(2);
    });

    it("should throw BadRequestException on error", async () => {
      zonesService.checkPointInZone.mockRejectedValue(new Error("Zone check failed"));

      await expect(service.routeOrder(mockDeliveryLocation)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("validateDeliveryLocation", () => {
    it("should return isValid true when location can be delivered to", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: true,
        matchingBranches: [{ branch: mockBranch, zone: mockZone }],
      } as any);

      const result = await service.validateDeliveryLocation(mockDeliveryLocation);

      expect(result.isValid).toBe(true);
      expect(result.branch).toEqual(mockBranch);
    });

    it("should return isValid false when location cannot be delivered to", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: false,
        matchingBranches: [],
      } as any);

      const result = await service.validateDeliveryLocation(mockDeliveryLocation);

      expect(result.isValid).toBe(false);
      expect(result.branch).toBeNull();
    });
  });

  describe("findNearestBranches", () => {
    it("should return branches sorted by distance", async () => {
      const nearBranch = { ...mockBranch, latitude: 30.05, longitude: 31.24 };
      const farBranch = { ...mockBranch, id: "far-branch", latitude: 31.0, longitude: 32.0 };
      branchesService.findOpen.mockResolvedValue({
        branches: [farBranch, nearBranch],
      } as any);

      const result = await service.findNearestBranches(30.0444, 31.2357, 2);

      expect(branchesService.findOpen).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("should limit results to specified count", async () => {
      const branches = Array.from({ length: 10 }, (_, i) => ({
        ...mockBranch,
        id: `branch-${i}`,
        latitude: 30.0 + i * 0.1,
      }));
      branchesService.findOpen.mockResolvedValue({ branches } as any);

      const result = await service.findNearestBranches(30.0444, 31.2357, 3);

      expect(result).toHaveLength(3);
    });
  });

  describe("getBranchWorkload", () => {
    it("should return workload information", async () => {
      const result = await service.getBranchWorkload(mockBranchId);

      expect(result.branchId).toBe(mockBranchId);
      expect(result.currentLoad).toBe("low");
      expect(result.canAcceptOrders).toBe(true);
      expect(result.estimatedWaitTime).toBe(30);
    });
  });

  describe("optimizeDeliveryRoute", () => {
    it("should return optimized route with distance", async () => {
      branchesService.findOne.mockResolvedValue(mockBranch as any);
      const deliveryLocations = [
        { latitude: 30.05, longitude: 31.25 },
        { latitude: 30.06, longitude: 31.26 },
      ];

      const result = await service.optimizeDeliveryRoute(mockBranchId, deliveryLocations);

      expect(branchesService.findOne).toHaveBeenCalledWith(mockBranchId);
      expect(result.optimizedRoute).toHaveLength(2);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.estimatedTime).toBeGreaterThan(0);
    });

    it("should return zero distance for empty locations", async () => {
      branchesService.findOne.mockResolvedValue(mockBranch as any);

      const result = await service.optimizeDeliveryRoute(mockBranchId, []);

      expect(result.totalDistance).toBe(0);
      expect(result.estimatedTime).toBe(0);
    });
  });
});
