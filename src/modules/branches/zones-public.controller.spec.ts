import { Test, type TestingModule } from "@nestjs/testing";
import { ZonesPublicController } from "./zones-public.controller";
import { ZonesService } from "./zones.service";

describe("ZonesPublicController", () => {
  let controller: ZonesPublicController;
  let zonesService: jest.Mocked<ZonesService>;

  const mockBranch = {
    id: "branch-123",
    name: { en: "Test Branch" },
    isActive: true,
    isOpen: true,
  };

  const mockZone = {
    id: "zone-123",
    name: { en: "Zone 1" },
    branchId: "branch-123",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZonesPublicController],
      providers: [
        {
          provide: ZonesService,
          useValue: {
            checkPointInZone: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ZonesPublicController>(ZonesPublicController);
    zonesService = module.get(ZonesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkDeliveryZone", () => {
    it("should return delivery zone info when point is in zone", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: true,
        matchingBranches: [{ branch: mockBranch, zone: mockZone }],
      } as any);

      const result = await controller.checkDeliveryZone(30.05, 31.25);

      expect(zonesService.checkPointInZone).toHaveBeenCalledWith({
        latitude: 30.05,
        longitude: 31.25,
      });
      expect(result.message).toBe("Zone check completed");
      expect(result.data.canDeliver).toBe(true);
      expect(result.data.recommendedBranch).toEqual(mockBranch);
    });

    it("should return cannot deliver when point is not in zone", async () => {
      zonesService.checkPointInZone.mockResolvedValue({
        isInZone: false,
        matchingBranches: [],
      } as any);

      const result = await controller.checkDeliveryZone(0, 0);

      expect(result.data.canDeliver).toBe(false);
      expect(result.data.recommendedBranch).toBeNull();
      expect(result.data.availableBranches).toEqual([]);
    });
  });
});
