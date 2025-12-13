import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check overall application health' })
  @ApiResponse({ status: 200, description: 'Health check passed' })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', threshold: 250 * 1024 * 1024 * 1024 }),
    ]);
  }

  @Get('database')
  @ApiOperation({ summary: 'Check database connectivity' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  @HealthCheck()
  checkDatabase() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('memory')
  @ApiOperation({ summary: 'Check memory usage' })
  @ApiResponse({ status: 200, description: 'Memory usage is healthy' })
  @ApiResponse({ status: 503, description: 'Memory usage is unhealthy' })
  @HealthCheck()
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
    ]);
  }

  @Get('disk')
  @ApiOperation({ summary: 'Check disk usage' })
  @ApiResponse({ status: 200, description: 'Disk usage is healthy' })
  @ApiResponse({ status: 503, description: 'Disk usage is unhealthy' })
  @HealthCheck()
  checkDisk() {
    return this.health.check([
      () => this.disk.checkStorage('storage', { path: '/', threshold: 250 * 1024 * 1024 * 1024 }),
    ]);
  }

  @Get('docker')
  @ApiOperation({ summary: 'Check Docker container health' })
  @ApiResponse({ status: 200, description: 'Docker container is healthy' })
  @ApiResponse({ status: 503, description: 'Docker container is unhealthy' })
  async checkDocker() {
    return this.healthService.checkDockerHealth();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed health information including system metrics' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealthInfo();
  }
}