import { Test, type TestingModule } from "@nestjs/testing";
import { BranchesController } from "./branches.controller";
import { BranchesService } from "./branches.service";
import { ZonesService } from "./zones.service";

describe("BranchesController", () => {
  let controller: BranchesController;
  let branchesService: jest.Mocked<BranchesService>;
  let zonesService: jest.Mocked<ZonesService>;

  const mockBranchId = "branch-123";
  const mockBranch = {
    id: mockBranchId,
    name: { en: "Test Branch", ar: "فرع تجريبي" },
    latitude: 30.0444,
    longitude: 31.2357,
    isActive: true,
    isOpen: true,
  };

  const mockZone = {
    id: "zone-123",
    name: { en: "Zone 1", ar: "منطقة 1" },
    branchId: mockBranchId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchesController],
      providers: [
        {
          provide: BranchesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findActive: jest.fn(),
            findOpen: jest.fn(),
            findNearby: jest.fn(),
            findOne: jest.fn(),
            getBranchStats: jest.fn(),
            update: jest.fn(),
            toggleStatus: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: ZonesService,
          useValue: {
            checkPointInZone: jest.fn(),
            findBestBranchForLocation: jest.fn(),
            findByBranch: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BranchesController>(BranchesController);
    branchesService = module.get(BranchesService);
    zonesService = module.get(ZonesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a branch", async () => {
      const createDto = {
        name: { en: "New Branch", ar: "فرع جديد" },
        latitude: 30.0,
        longitude: 31.0,
      } as any;
      branchesService.create.mockResolvedValue(mockBranch as any);

      const result = await controller.create(createDto);

      expect(branchesService.create).toHaveBeenCalledWith(createDto);
      expect(result.message).toBe("Branch created successfully");
    });
  });

  describe("findAll", () => {
    it("should return all branches when no status filter", async () => {
      const paginatedResult = {
        branches: [mockBranch],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      branchesService.findAll.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll(undefined, { page: 1, limit: 10 });

      expect(branchesService.findAll).toHaveBeenCalledWith(1, 10, undefined, "DESC");
      expect(result.message).toBe("Branches retrieved successfully");
    });

    it("should return active branches when status is active", async () => {
      const paginatedResult = { branches: [mockBranch], total: 1 };
      branchesService.findActive.mockResolvedValue(paginatedResult as any);

      await controller.findAll("active", { page: 1, limit: 10 });

      expect(branchesService.findActive).toHaveBeenCalled();
    });

    it("should return open branches when status is open", async () => {
      const paginatedResult = { branches: [mockBranch], total: 1 };
      branchesService.findOpen.mockResolvedValue(paginatedResult as any);

      await controller.findAll("open", { page: 1, limit: 10 });

      expect(branchesService.findOpen).toHaveBeenCalled();
    });

    it("should use default pagination values", async () => {
      branchesService.findAll.mockResolvedValue({ branches: [], total: 0 } as any);

      await controller.findAll("all", {});

      expect(branchesService.findAll).toHaveBeenCalledWith(1, 10, undefined, "DESC");
    });
  });

  describe("findNearby", () => {
    it("should return nearby branches", async () => {
      branchesService.findNearby.mockResolvedValue([mockBranch] as any);

      const result = await controller.findNearby(30.0, 31.0, 10);

      expect(branchesService.findNearby).toHaveBeenCalledWith(30.0, 31.0, 10);
      expect(result.message).toBe("Nearby branches retrieved successfully");
    });
  });

  describe("checkDeliveryZone", () => {
    it("should return zone check result with matching branches", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: true,
        matchingBranches: [{ branch: mockBranch, zone: mockZone }],
      } as any);

      const dto = { latitude: 30.05, longitude: 31.25 };
      const result = await controller.checkDeliveryZone(dto);

      expect(zonesService.checkPointInZone).toHaveBeenCalledWith(dto);
      expect(result.data.canDeliver).toBe(true);
      expect(result.data.recommendedBranch).toEqual(mockBranch);
    });

    it("should return no recommended branch when no matches", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: false,
        matchingBranches: [],
      } as any);

      const dto = { latitude: 0, longitude: 0 };
      const result = await controller.checkDeliveryZone(dto);

      expect(result.data.canDeliver).toBe(false);
      expect(result.data.recommendedBranch).toBeNull();
    });
  });

  describe("findServingBranch", () => {
    it("should return serving branch when found", async () => {
      zonesService.findBestBranchForLocation.mockResolvedValue(mockBranch as any);

      const dto = { latitude: 30.05, longitude: 31.25 };
      const result = await controller.findServingBranch(dto);

      expect(zonesService.findBestBranchForLocation).toHaveBeenCalledWith(dto);
      expect(result.message).toBe("Serving branch found");
    });

    it("should return null when no serving branch found", async () => {
      zonesService.findBestBranchForLocation.mockResolvedValue(null);

      const dto = { latitude: 0, longitude: 0 };
      const result = await controller.findServingBranch(dto);

      expect(result.message).toBe("No serving branch found");
      expect(result.data.branch).toBeNull();
    });
  });

  describe("findOne", () => {
    it("should return a branch by id", async () => {
      branchesService.findOne.mockResolvedValue(mockBranch as any);

      const result = await controller.findOne(mockBranchId);

      expect(branchesService.findOne).toHaveBeenCalledWith(mockBranchId);
      expect(result.message).toBe("Branch retrieved successfully");
    });
  });

  describe("getBranchStats", () => {
    it("should return branch statistics", async () => {
      const stats = { totalOrders: 100, totalRevenue: 5000 };
      branchesService.getBranchStats.mockResolvedValue(stats as any);

      const result = await controller.getBranchStats(mockBranchId);

      expect(branchesService.getBranchStats).toHaveBeenCalledWith(mockBranchId);
      expect(result.message).toBe("Branch statistics retrieved successfully");
    });
  });

  describe("getBranchZones", () => {
    it("should return branch zones", async () => {
      zonesService.findByBranch.mockResolvedValue([mockZone] as any);

      const result = await controller.getBranchZones(mockBranchId);

      expect(zonesService.findByBranch).toHaveBeenCalledWith(mockBranchId);
      expect(result.message).toBe("Branch zones retrieved successfully");
    });
  });

  describe("update", () => {
    it("should update a branch", async () => {
      const updateDto = { name: { en: "Updated Branch" } } as any;
      branchesService.update.mockResolvedValue({ ...mockBranch, ...updateDto } as any);

      const result = await controller.update(mockBranchId, updateDto);

      expect(branchesService.update).toHaveBeenCalledWith(mockBranchId, updateDto);
      expect(result.message).toBe("Branch updated successfully");
    });
  });

  describe("toggleStatus", () => {
    it("should toggle active status", async () => {
      const updatedBranch = { ...mockBranch, isActive: false };
      branchesService.toggleStatus.mockResolvedValue(updatedBranch as any);

      const result = await controller.toggleStatus(mockBranchId, "active");

      expect(branchesService.toggleStatus).toHaveBeenCalledWith(mockBranchId, "active");
      expect(result.message).toBe("Branch active status toggled successfully");
    });

    it("should toggle open status", async () => {
      const updatedBranch = { ...mockBranch, isOpen: false };
      branchesService.toggleStatus.mockResolvedValue(updatedBranch as any);

      const result = await controller.toggleStatus(mockBranchId, "open");

      expect(branchesService.toggleStatus).toHaveBeenCalledWith(mockBranchId, "open");
      expect(result.message).toBe("Branch open status toggled successfully");
    });
  });

  describe("remove", () => {
    it("should delete a branch", async () => {
      branchesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockBranchId);

      expect(branchesService.remove).toHaveBeenCalledWith(mockBranchId);
      expect(result.message).toBe("Branch deleted successfully");
    });
  });
});
