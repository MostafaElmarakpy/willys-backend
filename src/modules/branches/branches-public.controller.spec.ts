import { Test, type TestingModule } from "@nestjs/testing";
import { BranchesPublicController } from "./branches-public.controller";
import { BranchesService } from "./branches.service";
import { ZonesService } from "./zones.service";

describe("BranchesPublicController", () => {
  let controller: BranchesPublicController;
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
    name: { en: "Zone 1" },
    branchId: mockBranchId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BranchesPublicController],
      providers: [
        {
          provide: BranchesService,
          useValue: {
            findActive: jest.fn(),
            findNearby: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: ZonesService,
          useValue: {
            checkPointInZone: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<BranchesPublicController>(BranchesPublicController);
    branchesService = module.get(BranchesService);
    zonesService = module.get(ZonesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAllActive", () => {
    it("should return active branches", async () => {
      branchesService.findActive.mockResolvedValue({
        branches: [mockBranch],
        total: 1,
      } as any);

      const result = await controller.findAllActive();

      expect(branchesService.findActive).toHaveBeenCalledWith(1, 100);
      expect(result.message).toBe("Branches retrieved successfully");
      expect(result.data).toHaveLength(1);
    });
  });

  describe("findNearby", () => {
    it("should return nearby branches", async () => {
      branchesService.findNearby.mockResolvedValue([mockBranch] as any);

      const result = await controller.findNearby(30.0, 31.0, 10);

      expect(branchesService.findNearby).toHaveBeenCalledWith(30.0, 31.0, 10);
      expect(result.message).toBe("Nearby branches retrieved successfully");
    });

    it("should work without radius parameter", async () => {
      branchesService.findNearby.mockResolvedValue([mockBranch] as any);

      const result = await controller.findNearby(30.0, 31.0);

      expect(branchesService.findNearby).toHaveBeenCalledWith(
        30.0,
        31.0,
        undefined,
      );
    });
  });

  describe("findServingBranch", () => {
    it("should return serving branch when found", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: true,
        matchingBranches: [{ branch: mockBranch, zone: mockZone }],
      } as any);

      const result = await controller.findServingBranch(30.05, 31.25);

      expect(zonesService.checkPointInZone).toHaveBeenCalledWith({
        latitude: 30.05,
        longitude: 31.25,
      });
      expect(result.message).toBe("Serving branch found");
      expect(result.data.branch).toEqual(mockBranch);
      expect(result.data.canDeliver).toBe(true);
    });

    it("should return null when no serving branch found", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: false,
        matchingBranches: [],
      } as any);

      const result = await controller.findServingBranch(0, 0);

      expect(result.message).toBe("No branch serves this location");
      expect(result.data.branch).toBeNull();
      expect(result.data.canDeliver).toBe(false);
    });
  });

  describe("findOne", () => {
    it("should return branch by id", async () => {
      branchesService.findOne.mockResolvedValue(mockBranch as any);

      const result = await controller.findOne(mockBranchId);

      expect(branchesService.findOne).toHaveBeenCalledWith(mockBranchId);
      expect(result.message).toBe("Branch retrieved successfully");
    });
  });
});
