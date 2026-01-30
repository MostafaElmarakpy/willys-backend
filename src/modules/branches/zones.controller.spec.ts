import { Test, type TestingModule } from "@nestjs/testing";
import { ZonesController } from "./zones.controller";
import { ZonesService } from "./zones.service";

describe("ZonesController", () => {
  let controller: ZonesController;
  let zonesService: jest.Mocked<ZonesService>;

  const mockZoneId = "zone-123";
  const mockBranchId = "branch-123";

  const mockZone = {
    id: mockZoneId,
    name: { en: "Zone 1", ar: "منطقة 1" },
    branchId: mockBranchId,
    polygon: {
      type: "Polygon",
      coordinates: [
        [
          [31.2, 30.0],
          [31.3, 30.0],
          [31.3, 30.1],
          [31.2, 30.1],
          [31.2, 30.0],
        ],
      ],
    },
    isActive: true,
    priority: 1,
    deliveryFee: 10,
  };

  const mockBranch = {
    id: mockBranchId,
    name: { en: "Test Branch", ar: "فرع تجريبي" },
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZonesController],
      providers: [
        {
          provide: ZonesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            checkPointInZone: jest.fn(),
            findBestBranchForLocation: jest.fn(),
            findByBranch: jest.fn(),
            findOne: jest.fn(),
            getZoneStats: jest.fn(),
            update: jest.fn(),
            toggleActive: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ZonesController>(ZonesController);
    zonesService = module.get(ZonesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new zone", async () => {
      const createDto = {
        name: { en: "New Zone" },
        branchId: mockBranchId,
        polygon: mockZone.polygon,
      } as any;
      zonesService.create.mockResolvedValue(mockZone as any);

      const result = await controller.create(createDto);

      expect(zonesService.create).toHaveBeenCalledWith(createDto);
      expect(result.message).toBe("Zone created successfully");
    });
  });

  describe("findAll", () => {
    it("should return paginated zones", async () => {
      const paginatedResult = {
        zones: [mockZone],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      zonesService.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(zonesService.findAll).toHaveBeenCalledWith(
        1,
        10,
        undefined,
        "DESC",
      );
      expect(result.message).toBe("Zones retrieved successfully");
    });
  });

  describe("checkPoint", () => {
    it("should check if point is in zone", async () => {
      const zoneCheckDto = { latitude: 30.05, longitude: 31.25 };
      const checkResult = {
        isInZone: true,
        matchingBranches: [{ branch: mockBranch, zone: mockZone }],
      };
      zonesService.checkPointInZone.mockResolvedValue(checkResult as any);

      const result = await controller.checkPoint(zoneCheckDto);

      expect(zonesService.checkPointInZone).toHaveBeenCalledWith(zoneCheckDto);
      expect(result.message).toBe("Point check completed");
      expect(result.data.isInZone).toBe(true);
    });

    it("should return false when point is not in any zone", async () => {
      const zoneCheckDto = { latitude: 0, longitude: 0 };
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: false,
        matchingBranches: [],
      } as any);

      const result = await controller.checkPoint(zoneCheckDto);

      expect(result.data.isInZone).toBe(false);
    });
  });

  describe("findBranchForLocation", () => {
    it("should find best branch for location", async () => {
      const zoneCheckDto = { latitude: 30.05, longitude: 31.25 };
      zonesService.findBestBranchForLocation.mockResolvedValue(
        mockBranch as any,
      );

      const result = await controller.findBranchForLocation(zoneCheckDto);

      expect(zonesService.findBestBranchForLocation).toHaveBeenCalledWith(
        zoneCheckDto,
      );
      expect(result.message).toBe("Branch found for location");
      expect(result.data.branch).toEqual(mockBranch);
    });

    it("should return null when no branch serves location", async () => {
      const zoneCheckDto = { latitude: 0, longitude: 0 };
      zonesService.findBestBranchForLocation.mockResolvedValue(null);

      const result = await controller.findBranchForLocation(zoneCheckDto);

      expect(result.message).toBe("No branch serves this location");
      expect(result.data.branch).toBeNull();
    });
  });

  describe("findByBranch", () => {
    it("should return zones for a branch", async () => {
      zonesService.findByBranch.mockResolvedValue([mockZone] as any);

      const result = await controller.findByBranch(mockBranchId);

      expect(zonesService.findByBranch).toHaveBeenCalledWith(mockBranchId);
      expect(result.message).toBe("Branch zones retrieved successfully");
      expect(result.data).toHaveLength(1);
    });
  });

  describe("findOne", () => {
    it("should return zone by id", async () => {
      zonesService.findOne.mockResolvedValue(mockZone as any);

      const result = await controller.findOne(mockZoneId);

      expect(zonesService.findOne).toHaveBeenCalledWith(mockZoneId);
      expect(result.message).toBe("Zone retrieved successfully");
    });
  });

  describe("getZoneStats", () => {
    it("should return zone statistics", async () => {
      const stats = {
        zone: mockZone,
        stats: {
          polygonArea: 100,
          isActive: true,
        },
      };
      zonesService.getZoneStats.mockResolvedValue(stats as any);

      const result = await controller.getZoneStats(mockZoneId);

      expect(zonesService.getZoneStats).toHaveBeenCalledWith(mockZoneId);
      expect(result.message).toBe("Zone statistics retrieved successfully");
    });
  });

  describe("update", () => {
    it("should update a zone", async () => {
      const updateDto = { name: { en: "Updated Zone" } } as any;
      const updatedZone = { ...mockZone, name: { en: "Updated Zone" } };
      zonesService.update.mockResolvedValue(updatedZone as any);

      const result = await controller.update(mockZoneId, updateDto);

      expect(zonesService.update).toHaveBeenCalledWith(mockZoneId, updateDto);
      expect(result.message).toBe("Zone updated successfully");
    });
  });

  describe("toggleActive", () => {
    it("should toggle zone active status", async () => {
      const toggledZone = { ...mockZone, isActive: false };
      zonesService.toggleActive.mockResolvedValue(toggledZone as any);

      const result = await controller.toggleActive(mockZoneId);

      expect(zonesService.toggleActive).toHaveBeenCalledWith(mockZoneId);
      expect(result.message).toBe("Zone active status toggled successfully");
    });
  });

  describe("remove", () => {
    it("should delete a zone", async () => {
      zonesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockZoneId);

      expect(zonesService.remove).toHaveBeenCalledWith(mockZoneId);
      expect(result.message).toBe("Zone deleted successfully");
    });
  });
});
