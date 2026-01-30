import { Test, type TestingModule } from "@nestjs/testing";
import {
  DiskHealthIndicator,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

describe("HealthController", () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let healthService: jest.Mocked<HealthService>;

  const mockHealthResult = {
    status: "ok",
    info: {
      database: { status: "up" },
    },
    error: {},
    details: {
      database: { status: "up" },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn(),
            checkRSS: jest.fn(),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest.fn(),
          },
        },
        {
          provide: HealthService,
          useValue: {
            checkDockerHealth: jest.fn(),
            getDetailedHealthInfo: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    healthService = module.get(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("check", () => {
    it("should return overall health status", async () => {
      healthCheckService.check.mockResolvedValue(mockHealthResult as any);

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result.status).toBe("ok");
    });
  });

  describe("checkDatabase", () => {
    it("should check database health", async () => {
      healthCheckService.check.mockResolvedValue({
        status: "ok",
        info: { database: { status: "up" } },
      } as any);

      const result = await controller.checkDatabase();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result.status).toBe("ok");
    });
  });

  describe("checkMemory", () => {
    it("should check memory health", async () => {
      healthCheckService.check.mockResolvedValue({
        status: "ok",
        info: {
          memory_heap: { status: "up" },
          memory_rss: { status: "up" },
        },
      } as any);

      const result = await controller.checkMemory();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result.status).toBe("ok");
    });
  });

  describe("checkDisk", () => {
    it("should check disk health", async () => {
      healthCheckService.check.mockResolvedValue({
        status: "ok",
        info: { storage: { status: "up" } },
      } as any);

      const result = await controller.checkDisk();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result.status).toBe("ok");
    });
  });

  describe("checkDocker", () => {
    it("should check docker health", async () => {
      const dockerHealth = {
        status: "healthy",
        containerName: "willys-backend",
        memoryUsage: "512MB",
      };
      healthService.checkDockerHealth.mockResolvedValue(dockerHealth as any);

      const result = await controller.checkDocker();

      expect(healthService.checkDockerHealth).toHaveBeenCalled();
      expect(result).toEqual(dockerHealth);
    });
  });

  describe("getDetailedHealth", () => {
    it("should return detailed health information", async () => {
      const detailedHealth = {
        status: "healthy",
        uptime: 86400,
        memory: {
          heapUsed: 100000000,
          heapTotal: 200000000,
          rss: 300000000,
        },
        cpu: {
          user: 10,
          system: 5,
        },
      };
      healthService.getDetailedHealthInfo.mockResolvedValue(
        detailedHealth as any,
      );

      const result = await controller.getDetailedHealth();

      expect(healthService.getDetailedHealthInfo).toHaveBeenCalled();
      expect(result).toEqual(detailedHealth);
    });
  });
});
