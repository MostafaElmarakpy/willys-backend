import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Branch } from "../../database/entities/branch.entity";
import { BranchesService } from "./branches.service";

describe("BranchesService", () => {
  let service: BranchesService;
  let branchRepository: jest.Mocked<Repository<Branch>>;

  const mockBranchId = "branch-123";

  const mockBranch: Partial<Branch> = {
    id: mockBranchId,
    name: { en: "Main Branch", ar: "الفرع الرئيسي" },
    address: "123 Main Street",
    latitude: 30.0444,
    longitude: 31.2357,
    phone: "+201234567890",
    email: "branch@example.com",
    isActive: true,
    isOpen: true,
    openingHours: "09:00",
    closingHours: "22:00",
    estimatedDeliveryTime: 30,
    zones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        {
          provide: getRepositoryToken(Branch),
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
      ],
    }).compile();

    service = module.get<BranchesService>(BranchesService);
    branchRepository = module.get(getRepositoryToken(Branch));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a branch successfully", async () => {
      const createBranchDto = {
        name: { en: "New Branch", ar: "فرع جديد" },
        address: "456 New Street",
        latitude: 30.0444,
        longitude: 31.2357,
      };

      branchRepository.create.mockReturnValue(mockBranch as Branch);
      branchRepository.save.mockResolvedValue(mockBranch as Branch);

      const result = await service.create(createBranchDto);

      expect(result).toBeDefined();
      expect(branchRepository.create).toHaveBeenCalledWith({
        ...createBranchDto,
        isActive: true,
        isOpen: true,
      });
      expect(branchRepository.save).toHaveBeenCalled();
    });

    it("should create a branch with custom isActive and isOpen values", async () => {
      const createBranchDto = {
        name: { en: "New Branch", ar: "فرع جديد" },
        address: "456 New Street",
        latitude: 30.0444,
        longitude: 31.2357,
        isActive: false,
        isOpen: false,
      };

      branchRepository.create.mockReturnValue({
        ...mockBranch,
        isActive: false,
        isOpen: false,
      } as Branch);
      branchRepository.save.mockResolvedValue({
        ...mockBranch,
        isActive: false,
        isOpen: false,
      } as Branch);

      const result = await service.create(createBranchDto);

      expect(result.isActive).toBe(false);
      expect(result.isOpen).toBe(false);
    });

    it("should throw BadRequestException on save error", async () => {
      const createBranchDto = {
        name: { en: "New Branch", ar: "فرع جديد" },
        address: "456 New Street",
        latitude: 30.0444,
        longitude: 31.2357,
      };

      branchRepository.create.mockReturnValue(mockBranch as Branch);
      branchRepository.save.mockRejectedValue(new Error("Database error"));

      await expect(service.create(createBranchDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated branches", async () => {
      branchRepository.findAndCount.mockResolvedValue([
        [mockBranch as Branch],
        1,
      ]);

      const result = await service.findAll(1, 10);

      expect(result.branches).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it("should apply pagination correctly", async () => {
      branchRepository.findAndCount.mockResolvedValue([
        [mockBranch as Branch],
        25,
      ]);

      const result = await service.findAll(2, 10);

      expect(branchRepository.findAndCount).toHaveBeenCalledWith({
        relations: ["zones"],
        order: { name: "DESC" },
        skip: 10,
        take: 10,
      });
      expect(result.totalPages).toBe(3);
    });

    it("should sort by allowed field", async () => {
      branchRepository.findAndCount.mockResolvedValue([
        [mockBranch as Branch],
        1,
      ]);

      await service.findAll(1, 10, "createdAt", "ASC");

      expect(branchRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: "ASC" },
        }),
      );
    });

    it("should default to name sort for invalid sort field", async () => {
      branchRepository.findAndCount.mockResolvedValue([
        [mockBranch as Branch],
        1,
      ]);

      await service.findAll(1, 10, "invalidField", "DESC");

      expect(branchRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { name: "DESC" },
        }),
      );
    });
  });

  describe("findActive", () => {
    it("should return only active branches", async () => {
      branchRepository.findAndCount.mockResolvedValue([
        [mockBranch as Branch],
        1,
      ]);

      const result = await service.findActive(1, 10);

      expect(branchRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
      expect(result.branches).toHaveLength(1);
    });

    it("should apply sorting to active branches", async () => {
      branchRepository.findAndCount.mockResolvedValue([
        [mockBranch as Branch],
        1,
      ]);

      await service.findActive(1, 10, "city", "ASC");

      expect(branchRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          order: { city: "ASC" },
        }),
      );
    });
  });

  describe("findOpen", () => {
    it("should return only active and open branches", async () => {
      branchRepository.findAndCount.mockResolvedValue([
        [mockBranch as Branch],
        1,
      ]);

      const result = await service.findOpen(1, 10);

      expect(branchRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, isOpen: true },
        }),
      );
      expect(result.branches).toHaveLength(1);
    });

    it("should apply pagination to open branches", async () => {
      branchRepository.findAndCount.mockResolvedValue([
        [mockBranch as Branch],
        15,
      ]);

      const result = await service.findOpen(2, 10);

      expect(branchRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.totalPages).toBe(2);
    });
  });

  describe("findOne", () => {
    it("should return a branch by id", async () => {
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);

      const result = await service.findOne(mockBranchId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockBranchId);
      expect(branchRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockBranchId },
        relations: ["zones"],
      });
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockBranchId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a branch successfully", async () => {
      const updateBranchDto = {
        name: { en: "Updated Branch", ar: "فرع محدث" },
        phone: "+201111111111",
      };

      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      branchRepository.save.mockResolvedValue({
        ...mockBranch,
        ...updateBranchDto,
      } as Branch);

      const result = await service.update(mockBranchId, updateBranchDto);

      expect(result.name.en).toBe("Updated Branch");
      expect(branchRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockBranchId, { name: { en: "Test", ar: "اختبار" } }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException on save error", async () => {
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      branchRepository.save.mockRejectedValue(new Error("Database error"));

      await expect(
        service.update(mockBranchId, { name: { en: "Test", ar: "اختبار" } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("remove", () => {
    it("should remove a branch successfully", async () => {
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      branchRepository.remove.mockResolvedValue(mockBranch as Branch);

      await service.remove(mockBranchId);

      expect(branchRepository.remove).toHaveBeenCalledWith(mockBranch);
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockBranchId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("toggleStatus", () => {
    it("should toggle isActive status", async () => {
      const activeBranch = { ...mockBranch, isActive: true };
      branchRepository.findOne.mockResolvedValue(activeBranch as Branch);
      branchRepository.save.mockResolvedValue({
        ...activeBranch,
        isActive: false,
      } as Branch);

      const result = await service.toggleStatus(mockBranchId, "active");

      expect(branchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
      expect(result.isActive).toBe(false);
    });

    it("should toggle isOpen status", async () => {
      const openBranch = { ...mockBranch, isOpen: true };
      branchRepository.findOne.mockResolvedValue(openBranch as Branch);
      branchRepository.save.mockResolvedValue({
        ...openBranch,
        isOpen: false,
      } as Branch);

      const result = await service.toggleStatus(mockBranchId, "open");

      expect(branchRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isOpen: false,
        }),
      );
      expect(result.isOpen).toBe(false);
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.toggleStatus(mockBranchId, "active"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findNearby", () => {
    it("should find nearby branches", async () => {
      const nearbyBranches = [
        { ...mockBranch, distance: 2.5 },
        { ...mockBranch, id: "branch-456", distance: 5.0 },
      ];

      branchRepository.query.mockResolvedValue(nearbyBranches);

      const result = await service.findNearby(30.0444, 31.2357, 10);

      expect(result).toHaveLength(2);
      expect(branchRepository.query).toHaveBeenCalledWith(
        expect.any(String),
        [30.0444, 31.2357, 10],
      );
    });

    it("should use default radius of 10km", async () => {
      branchRepository.query.mockResolvedValue([]);

      await service.findNearby(30.0444, 31.2357);

      expect(branchRepository.query).toHaveBeenCalledWith(
        expect.any(String),
        [30.0444, 31.2357, 10],
      );
    });

    it("should return empty array if no nearby branches", async () => {
      branchRepository.query.mockResolvedValue([]);

      const result = await service.findNearby(0, 0, 5);

      expect(result).toHaveLength(0);
    });
  });

  describe("getBranchStats", () => {
    it("should return branch statistics", async () => {
      const branchWithZones = {
        ...mockBranch,
        zones: [
          { id: "zone-1", isActive: true },
          { id: "zone-2", isActive: true },
          { id: "zone-3", isActive: false },
        ],
      };

      branchRepository.findOne.mockResolvedValue(branchWithZones as any);

      const result = await service.getBranchStats(mockBranchId);

      expect(result.branch).toBeDefined();
      expect(result.stats.totalZones).toBe(3);
      expect(result.stats.activeZones).toBe(2);
    });

    it("should return zero zones if branch has no zones", async () => {
      const branchWithoutZones = { ...mockBranch, zones: undefined };
      branchRepository.findOne.mockResolvedValue(branchWithoutZones as any);

      const result = await service.getBranchStats(mockBranchId);

      expect(result.stats.totalZones).toBe(0);
      expect(result.stats.activeZones).toBe(0);
    });

    it("should throw NotFoundException if branch not found", async () => {
      branchRepository.findOne.mockResolvedValue(null);

      await expect(service.getBranchStats(mockBranchId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
