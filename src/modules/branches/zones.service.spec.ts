import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { Branch } from "../../database/entities/branch.entity";
import { Zone } from "../../database/entities/zone.entity";
import { ZonesService } from "./zones.service";

describe("ZonesService", () => {
  let service: ZonesService;
  let zoneRepository: jest.Mocked<Repository<Zone>>;
  let branchRepository: jest.Mocked<Repository<Branch>>;

  const mockBranch: Partial<Branch> = {
    id: "branch-123",
    name: { en: "Test Branch", ar: "فرع تجريبي" },
    latitude: 30.0444,
    longitude: 31.2357,
    isActive: true,
    isOpen: true,
  };

  const mockZone: Partial<Zone> = {
    id: "zone-123",
    name: { en: "Zone 1", ar: "المنطقة 1" },
    branchId: "branch-123",
    branch: mockBranch as Branch,
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
    } as any,
    centerLatitude: 30.05,
    centerLongitude: 31.25,
    radiusKm: 5,
    isActive: true,
    priority: 1,
    deliveryFee: 10,
  };

  const mockCreateZoneDto = {
    name: { en: "Zone 1", ar: "المنطقة 1" },
    branchId: "branch-123",
    polygon: {
      type: "Polygon" as const,
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
    centerLatitude: 30.05,
    centerLongitude: 31.25,
    radiusKm: 5,
    isActive: true,
    priority: 1,
    deliveryFee: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZonesService,
        {
          provide: getRepositoryToken(Zone),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            remove: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Branch),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ZonesService>(ZonesService);
    zoneRepository = module.get(getRepositoryToken(Zone));
    branchRepository = module.get(getRepositoryToken(Branch));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new zone", async () => {
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      zoneRepository.query.mockResolvedValue([{ id: "zone-123" }]);
      zoneRepository.findOne.mockResolvedValue(mockZone as Zone);

      const result = await service.create(mockCreateZoneDto);

      expect(branchRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCreateZoneDto.branchId },
      });
      expect(zoneRepository.query).toHaveBeenCalled();
      expect(result).toEqual(mockZone);
    });

    it("should throw NotFoundException when branch not found", async () => {
      branchRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockCreateZoneDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException on database error", async () => {
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      zoneRepository.query.mockRejectedValue(new Error("DB Error"));

      await expect(service.create(mockCreateZoneDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated zones", async () => {
      const zones = [mockZone as Zone];
      zoneRepository.findAndCount.mockResolvedValue([zones, 1]);

      const result = await service.findAll(1, 10);

      expect(result.zones).toEqual(zones);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("should use default pagination values", async () => {
      zoneRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("should order by name when sortBy is name", async () => {
      zoneRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, "name", "ASC");

      expect(zoneRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { name: "ASC", createdAt: "ASC" },
        }),
      );
    });

    it("should use default sort field for invalid sortBy", async () => {
      zoneRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(1, 10, "invalidField");

      expect(zoneRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { priority: "DESC", createdAt: "ASC" },
        }),
      );
    });
  });

  describe("findByBranch", () => {
    it("should return zones for a branch", async () => {
      const zones = [mockZone as Zone];
      zoneRepository.find.mockResolvedValue(zones);

      const result = await service.findByBranch("branch-123");

      expect(zoneRepository.find).toHaveBeenCalledWith({
        where: { branchId: "branch-123", isActive: true },
        relations: ["branch"],
        order: { priority: "DESC" },
      });
      expect(result).toEqual(zones);
    });
  });

  describe("findOne", () => {
    it("should return a zone by id", async () => {
      zoneRepository.findOne.mockResolvedValue(mockZone as Zone);

      const result = await service.findOne("zone-123");

      expect(result).toEqual(mockZone);
    });

    it("should throw NotFoundException when zone not found", async () => {
      zoneRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne("unknown-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update zone with polygon", async () => {
      zoneRepository.findOne.mockResolvedValue(mockZone as Zone);
      zoneRepository.query.mockResolvedValue({ affected: 1 });

      const updateDto = {
        name: { en: "Updated Zone" },
        polygon: mockCreateZoneDto.polygon,
      };

      const result = await service.update("zone-123", updateDto);

      expect(zoneRepository.query).toHaveBeenCalled();
      expect(result).toEqual(mockZone);
    });

    it("should update zone without polygon using save", async () => {
      const updatedZone = { ...mockZone, name: { en: "Updated Zone" } };
      zoneRepository.findOne.mockResolvedValue(mockZone as Zone);
      zoneRepository.save.mockResolvedValue(updatedZone as Zone);

      const result = await service.update("zone-123", {
        name: { en: "Updated Zone" },
      });

      expect(zoneRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedZone);
    });

    it("should throw BadRequestException on update error", async () => {
      zoneRepository.findOne.mockResolvedValue(mockZone as Zone);
      zoneRepository.query.mockRejectedValue(new Error("Update failed"));

      await expect(
        service.update("zone-123", { polygon: mockCreateZoneDto.polygon }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should remove a zone", async () => {
      zoneRepository.findOne.mockResolvedValue(mockZone as Zone);
      zoneRepository.remove.mockResolvedValue(mockZone as Zone);

      await service.remove("zone-123");

      expect(zoneRepository.remove).toHaveBeenCalledWith(mockZone);
    });
  });

  describe("toggleActive", () => {
    it("should toggle zone active status", async () => {
      const activeZone = { ...mockZone, isActive: true };
      const inactiveZone = { ...mockZone, isActive: false };

      zoneRepository.findOne.mockResolvedValue(activeZone as Zone);
      zoneRepository.save.mockResolvedValue(inactiveZone as Zone);

      const _result = await service.toggleActive("zone-123");

      expect(zoneRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });

  describe("checkPointInZone", () => {
    it("should find matching branches for a point in zone", async () => {
      const zoneWithActiveBranch = {
        ...mockZone,
        branch: { ...mockBranch, isActive: true, isOpen: true },
      };
      zoneRepository.find.mockResolvedValue([zoneWithActiveBranch as Zone]);

      const result = await service.checkPointInZone({
        latitude: 30.05,
        longitude: 31.25,
      });

      expect(result.isInZone).toBe(true);
      expect(result.matchingBranches.length).toBeGreaterThan(0);
    });

    it("should return empty when no matching zones", async () => {
      zoneRepository.find.mockResolvedValue([]);

      const result = await service.checkPointInZone({
        latitude: 0,
        longitude: 0,
      });

      expect(result.isInZone).toBe(false);
      expect(result.matchingBranches).toEqual([]);
    });

    it("should skip inactive branches", async () => {
      const zoneWithInactiveBranch = {
        ...mockZone,
        branch: { ...mockBranch, isActive: false, isOpen: true },
      };
      zoneRepository.find.mockResolvedValue([zoneWithInactiveBranch as Zone]);

      const result = await service.checkPointInZone({
        latitude: 30.05,
        longitude: 31.25,
      });

      expect(result.isInZone).toBe(false);
    });

    it("should use radius-based check as fallback", async () => {
      const zoneWithRadius = {
        ...mockZone,
        polygon: null,
        centerLatitude: 30.05,
        centerLongitude: 31.25,
        radiusKm: 10,
        branch: { ...mockBranch, isActive: true, isOpen: true },
      };
      zoneRepository.find.mockResolvedValue([
        zoneWithRadius as unknown as Zone,
      ]);

      const result = await service.checkPointInZone({
        latitude: 30.05,
        longitude: 31.25,
      });

      expect(result.isInZone).toBe(true);
    });
  });

  describe("findBestBranchForLocation", () => {
    it("should return best branch for location", async () => {
      const zoneWithActiveBranch = {
        ...mockZone,
        branch: { ...mockBranch, isActive: true, isOpen: true },
      };
      zoneRepository.find.mockResolvedValue([zoneWithActiveBranch as Zone]);

      const result = await service.findBestBranchForLocation({
        latitude: 30.05,
        longitude: 31.25,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe("branch-123");
    });

    it("should return null when no matching branch", async () => {
      zoneRepository.find.mockResolvedValue([]);

      const result = await service.findBestBranchForLocation({
        latitude: 0,
        longitude: 0,
      });

      expect(result).toBeNull();
    });
  });

  describe("getZoneStats", () => {
    it("should return zone statistics", async () => {
      zoneRepository.findOne.mockResolvedValue(mockZone as Zone);

      const result = await service.getZoneStats("zone-123");

      expect(result.zone).toEqual(mockZone);
      expect(result.stats).toHaveProperty("polygonArea");
      expect(result.stats).toHaveProperty("isActive");
    });

    it("should return zero area for zone without polygon", async () => {
      const zoneWithoutPolygon = { ...mockZone, polygon: null };
      zoneRepository.findOne.mockResolvedValue(
        zoneWithoutPolygon as unknown as Zone,
      );

      const result = await service.getZoneStats("zone-123");

      expect(result.stats.polygonArea).toBe(0);
    });
  });

  describe("private methods", () => {
    describe("pointInPolygon", () => {
      it("should return true for point inside polygon", () => {
        const polygon = [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ];
        const point = [5, 5];

        const result = (service as any).pointInPolygon(point, polygon);

        expect(result).toBe(true);
      });

      it("should return false for point outside polygon", () => {
        const polygon = [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ];
        const point = [15, 15];

        const result = (service as any).pointInPolygon(point, polygon);

        expect(result).toBe(false);
      });
    });

    describe("calculateDistance", () => {
      it("should calculate distance between two points", () => {
        // Cairo to Giza (approximately 10km)
        const result = (service as any).calculateDistance(
          30.0444,
          31.2357,
          29.9792,
          31.1342,
        );

        // Should be roughly 12-15 km
        expect(result).toBeGreaterThan(10);
        expect(result).toBeLessThan(20);
      });

      it("should return 0 for same point", () => {
        const result = (service as any).calculateDistance(
          30.0444,
          31.2357,
          30.0444,
          31.2357,
        );

        expect(result).toBeCloseTo(0, 5);
      });
    });

    describe("wktToGeoJson", () => {
      it("should return GeoJSON if already in GeoJSON format", () => {
        const geoJson = {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
          ],
        };

        const result = (service as any).wktToGeoJson(geoJson);

        expect(result).toEqual(geoJson);
      });

      it("should convert WKT string to GeoJSON", () => {
        const wkt = "POLYGON((0 0, 1 0, 1 1, 0 0))";

        const result = (service as any).wktToGeoJson(wkt);

        expect(result.type).toBe("Polygon");
        expect(result.coordinates[0]).toHaveLength(4);
      });

      it("should throw error for invalid WKT format", () => {
        expect(() => (service as any).wktToGeoJson("INVALID")).toThrow(
          "Invalid WKT polygon format",
        );
      });

      it("should throw error for non-string non-GeoJSON input", () => {
        expect(() => (service as any).wktToGeoJson(123)).toThrow(
          "Invalid polygon format",
        );
      });
    });

    describe("calculatePolygonArea", () => {
      it("should calculate polygon area", () => {
        const polygon = {
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        };

        const result = (service as any).calculatePolygonArea(polygon);

        expect(result).toBe(100); // 10x10 square
      });

      it("should return 0 for null polygon", () => {
        const result = (service as any).calculatePolygonArea(null);

        expect(result).toBe(0);
      });

      it("should return 0 for polygon without coordinates", () => {
        const result = (service as any).calculatePolygonArea({});

        expect(result).toBe(0);
      });
    });
  });
});
