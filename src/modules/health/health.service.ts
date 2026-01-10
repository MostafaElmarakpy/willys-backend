import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { DataSource } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface HealthStatus {
  status: 'ok' | 'error';
  message?: string;
  details?: any;
}

export interface DetailedHealthInfo {
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  database: HealthStatus;
  docker: HealthStatus;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercentage: number;
    };
    cpu: {
      cores: number;
      model: string;
      loadAverage: number[];
    };
    disk: {
      free: number;
      total: number;
      usagePercentage: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async checkDockerHealth(): Promise<HealthStatus> {
    try {
      const isInDocker = await this.isRunningInDocker();

      if (!isInDocker) {
        return {
          status: 'ok',
          message: 'Application is not running in Docker',
          details: { containerized: false },
        };
      }

      const dockerStatus = await this.getDockerContainerStatus();
      return {
        status: 'ok',
        message: 'Docker container is healthy',
        details: dockerStatus,
      };
    } catch (error) {
      this.logger.error('Docker health check failed', error);
      return {
        status: 'error',
        message: 'Docker health check failed',
        details: { error: error.message },
      };
    }
  }

  async getDetailedHealthInfo(): Promise<DetailedHealthInfo> {
    const _startTime = Date.now();

    const [databaseStatus, dockerStatus, systemInfo] = await Promise.allSettled(
      [
        this.checkDatabaseHealth(),
        this.checkDockerHealth(),
        this.getSystemInfo(),
      ],
    );

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '0.0.1',
      database:
        databaseStatus.status === 'fulfilled'
          ? databaseStatus.value
          : { status: 'error', message: 'Failed to check database' },
      docker:
        dockerStatus.status === 'fulfilled'
          ? dockerStatus.value
          : { status: 'error', message: 'Failed to check docker' },
      system:
        systemInfo.status === 'fulfilled'
          ? systemInfo.value
          : {
              platform: process.platform,
              arch: process.arch,
              nodeVersion: process.version,
              memory: { total: 0, free: 0, used: 0, usagePercentage: 0 },
              cpu: { cores: 0, model: 'unknown', loadAverage: [] },
              disk: { free: 0, total: 0, usagePercentage: 0 },
            },
    };
  }

  private async checkDatabaseHealth(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      const options = this.dataSource.options as any;
      return {
        status: 'ok',
        message: 'Database connection is healthy',
        details: {
          type: options.type,
          host: options.host,
          database: options.database,
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'error',
        message: 'Database connection failed',
        details: { error: error.message },
      };
    }
  }

  private async isRunningInDocker(): Promise<boolean> {
    try {
      // Check for Docker-specific files
      const dockerFiles = ['/.dockerenv', '/proc/self/cgroup'];

      for (const file of dockerFiles) {
        try {
          await fs.promises.access(file);
          if (file === '/proc/self/cgroup') {
            const cgroup = await fs.promises.readFile(file, 'utf8');
            if (cgroup.includes('docker') || cgroup.includes('kubepods')) {
              return true;
            }
          } else {
            return true;
          }
        } catch {
          // File doesn't exist, continue checking
        }
      }

      return false;
    } catch (error) {
      this.logger.warn('Could not determine if running in Docker', error);
      return false;
    }
  }

  private async getDockerContainerStatus(): Promise<any> {
    try {
      const hostname = os.hostname();

      // Try to get container information
      const containerInfo: any = {
        hostname,
        containerId: process.env.HOSTNAME || hostname,
        isContainerized: true,
      };

      // Try to get more Docker info if available
      try {
        const { stdout: dockerVersion } = await execAsync('docker --version', {
          timeout: 5000,
        });
        containerInfo.dockerVersion = dockerVersion.trim();
      } catch {
        // Docker command not available inside container
      }

      // Get container stats if possible
      try {
        const cgroup = await fs.promises.readFile('/proc/self/cgroup', 'utf8');
        const containerIdMatch = cgroup.match(/docker\/([a-f0-9]{64})/);
        if (containerIdMatch) {
          containerInfo.fullContainerId = containerIdMatch[1];
          containerInfo.shortContainerId = containerIdMatch[1].substring(0, 12);
        }
      } catch {
        // Ignore if we can't read cgroup
      }

      return containerInfo;
    } catch (error) {
      throw new Error(
        `Failed to get Docker container status: ${error.message}`,
      );
    }
  }

  private async getSystemInfo(): Promise<any> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    let diskInfo = { free: 0, total: 0, usagePercentage: 0 };

    try {
      // Try to get disk usage
      const { stdout } = await execAsync('df -BG / | tail -1', {
        timeout: 5000,
      });
      const diskStats = stdout.trim().split(/\s+/);
      if (diskStats.length >= 4) {
        const total = parseInt(diskStats[1]) * 1024 * 1024 * 1024; // Convert GB to bytes
        const used = parseInt(diskStats[2]) * 1024 * 1024 * 1024;
        const free = parseInt(diskStats[3]) * 1024 * 1024 * 1024;
        diskInfo = {
          total,
          free,
          usagePercentage: Math.round((used / total) * 100),
        };
      }
    } catch (error) {
      this.logger.warn('Could not get disk usage information', error);
    }

    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usagePercentage: Math.round((usedMemory / totalMemory) * 100),
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        loadAverage: os.loadavg(),
      },
      disk: diskInfo,
    };
  }
}
