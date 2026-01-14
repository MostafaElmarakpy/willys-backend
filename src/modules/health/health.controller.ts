import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { HealthService } from "./health.service";

/**
 * Memory thresholds for health checks
 *
 * Docker container has 2GB limit (docker-compose.dev.yml: mem_limit: 2g)
 * - HEAP: 1GB (node heap memory allocation)
 * - RSS: 1.5GB (75% of Docker limit, leaving buffer for OS and other processes)
 *
 * These thresholds account for:
 * - Large file uploads (up to 150MB configured in main.ts)
 * - Normal application memory usage (200-500MB baseline)
 * - Memory spikes during request processing
 * - Buffer before Docker OOM killer activates
 */
const MEMORY_THRESHOLDS = {
  HEAP: 1024 * 1024 * 1024, // 1GB
  RSS: 1536 * 1024 * 1024, // 1.5GB
  DISK: 250 * 1024 * 1024 * 1024, // 250GB
} as const;

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Check overall application health" })
  @ApiResponse({ status: 200, description: "Health check passed" })
  @ApiResponse({ status: 503, description: "Health check failed" })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck("database"),
      () => this.memory.checkHeap("memory_heap", MEMORY_THRESHOLDS.HEAP),
      () => this.memory.checkRSS("memory_rss", MEMORY_THRESHOLDS.RSS),
      () =>
        this.disk.checkStorage("storage", {
          path: "/",
          threshold: MEMORY_THRESHOLDS.DISK,
        }),
    ]);
  }

  @Get("database")
  @ApiOperation({ summary: "Check database connectivity" })
  @ApiResponse({ status: 200, description: "Database is healthy" })
  @ApiResponse({ status: 503, description: "Database is unhealthy" })
  @HealthCheck()
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck("database")]);
  }

  @Get("memory")
  @ApiOperation({ summary: "Check memory usage" })
  @ApiResponse({ status: 200, description: "Memory usage is healthy" })
  @ApiResponse({ status: 503, description: "Memory usage is unhealthy" })
  @HealthCheck()
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap("memory_heap", MEMORY_THRESHOLDS.HEAP),
      () => this.memory.checkRSS("memory_rss", MEMORY_THRESHOLDS.RSS),
    ]);
  }

  @Get("disk")
  @ApiOperation({ summary: "Check disk usage" })
  @ApiResponse({ status: 200, description: "Disk usage is healthy" })
  @ApiResponse({ status: 503, description: "Disk usage is unhealthy" })
  @HealthCheck()
  checkDisk() {
    return this.health.check([
      () =>
        this.disk.checkStorage("storage", {
          path: "/",
          threshold: MEMORY_THRESHOLDS.DISK,
        }),
    ]);
  }

  @Get("docker")
  @ApiOperation({ summary: "Check Docker container health" })
  @ApiResponse({ status: 200, description: "Docker container is healthy" })
  @ApiResponse({ status: 503, description: "Docker container is unhealthy" })
  async checkDocker() {
    return this.healthService.checkDockerHealth();
  }

  @Get("detailed")
  @ApiOperation({
    summary: "Get detailed health information including system metrics",
  })
  @ApiResponse({ status: 200, description: "Detailed health information" })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealthInfo();
  }
}
