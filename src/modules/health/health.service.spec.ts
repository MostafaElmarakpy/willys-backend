import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { Test, type TestingModule } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { ConfigService } from "../../config/config.service";
import { HealthService } from "./health.service";

// Mock child_process.exec
jest.mock("node:child_process", () => ({
  exec: jest.fn(),
}));

// Mock fs.promises
jest.mock("node:fs", () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
  },
}));

describe("HealthService", () => {
  let service: HealthService;
  let dataSource: any;
  let mockExec: jest.Mock;

  beforeEach(async () => {
    mockExec = childProcess.exec as unknown as jest.Mock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("test-value"),
          },
        },
        {
          provide: DataSource,
          useValue: {
            query: jest.fn(),
            options: {
              type: "postgres",
              host: "localhost",
              database: "test_db",
            },
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    dataSource = module.get(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkDockerHealth", () => {
    it("should return ok status when not running in Docker", async () => {
      // Mock isRunningInDocker to return false
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      const result = await service.checkDockerHealth();

      expect(result.status).toBe("ok");
      expect(result.message).toBe("Application is not running in Docker");
      expect(result.details?.containerized).toBe(false);
    });

    it("should return ok status when running in Docker", async () => {
      // Mock /.dockerenv exists
      (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);

      // Mock docker version command
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (typeof opts === "function") {
          callback = opts;
        }
        if (cmd.includes("docker --version")) {
          if (callback) {
            callback(null, { stdout: "Docker version 20.10.0" });
          }
          return { stdout: "Docker version 20.10.0" };
        }
        if (callback) {
          callback(null, { stdout: "" });
        }
        return { stdout: "" };
      });

      const result = await service.checkDockerHealth();

      expect(result.status).toBe("ok");
      expect(result.message).toBe("Docker container is healthy");
    });

    it("should return error status when docker check fails", async () => {
      // Mock /.dockerenv exists to trigger docker path
      (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);

      // Mock getDockerContainerStatus to throw
      jest
        .spyOn(service as any, "getDockerContainerStatus")
        .mockRejectedValue(new Error("Docker check failed"));

      const result = await service.checkDockerHealth();

      expect(result.status).toBe("error");
      expect(result.message).toBe("Docker health check failed");
    });
  });

  describe("getDetailedHealthInfo", () => {
    it("should return detailed health info", async () => {
      // Mock database health
      dataSource.query.mockResolvedValue([{ 1: 1 }]);

      // Mock not in docker
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      // Mock disk usage command
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (typeof opts === "function") {
          callback = opts;
        }
        if (cmd.includes("df -BG")) {
          if (callback) {
            callback(null, { stdout: "/dev/sda1 100G 50G 50G 50% /" });
          }
          return { stdout: "/dev/sda1 100G 50G 50G 50% /" };
        }
        if (callback) {
          callback(null, { stdout: "" });
        }
        return { stdout: "" };
      });

      const result = await service.getDetailedHealthInfo();

      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("uptime");
      expect(result).toHaveProperty("environment");
      expect(result).toHaveProperty("version");
      expect(result).toHaveProperty("database");
      expect(result).toHaveProperty("docker");
      expect(result).toHaveProperty("system");
      expect(result.database.status).toBe("ok");
      expect(result.system).toHaveProperty("platform");
      expect(result.system).toHaveProperty("memory");
      expect(result.system).toHaveProperty("cpu");
    });

    it("should handle failed checks gracefully", async () => {
      // Mock database failure
      dataSource.query.mockRejectedValue(new Error("DB connection failed"));

      // Mock not in docker
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      // Mock disk command failure
      mockExec.mockImplementation((_cmd, opts, callback) => {
        if (typeof opts === "function") {
          callback = opts;
        }
        if (callback) {
          callback(new Error("Command failed"), null);
        }
        throw new Error("Command failed");
      });

      const result = await service.getDetailedHealthInfo();

      expect(result).toHaveProperty("timestamp");
      expect(result.database.status).toBe("error");
      expect(result.database.message).toBe("Database connection failed");
    });
  });

  describe("private checkDatabaseHealth", () => {
    it("should return ok when database is healthy", async () => {
      dataSource.query.mockResolvedValue([{ 1: 1 }]);

      const result = await (service as any).checkDatabaseHealth();

      expect(result.status).toBe("ok");
      expect(result.message).toBe("Database connection is healthy");
      expect(result.details.type).toBe("postgres");
      expect(result.details.host).toBe("localhost");
    });

    it("should return error when database query fails", async () => {
      dataSource.query.mockRejectedValue(new Error("Connection refused"));

      const result = await (service as any).checkDatabaseHealth();

      expect(result.status).toBe("error");
      expect(result.message).toBe("Database connection failed");
      expect(result.details.error).toBe("Connection refused");
    });
  });

  describe("private isRunningInDocker", () => {
    it("should return true when .dockerenv exists", async () => {
      (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await (service as any).isRunningInDocker();

      expect(result).toBe(true);
    });

    it("should return true when cgroup contains docker", async () => {
      // .dockerenv doesn't exist
      (fs.promises.access as jest.Mock).mockRejectedValueOnce(
        new Error("ENOENT"),
      );
      // /proc/self/cgroup exists
      (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);
      // cgroup content contains docker
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        "1:name=systemd:/docker/abc123",
      );

      const result = await (service as any).isRunningInDocker();

      expect(result).toBe(true);
    });

    it("should return true when cgroup contains kubepods", async () => {
      // .dockerenv doesn't exist
      (fs.promises.access as jest.Mock).mockRejectedValueOnce(
        new Error("ENOENT"),
      );
      // /proc/self/cgroup exists
      (fs.promises.access as jest.Mock).mockResolvedValueOnce(undefined);
      // cgroup content contains kubepods
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        "1:name=systemd:/kubepods/abc123",
      );

      const result = await (service as any).isRunningInDocker();

      expect(result).toBe(true);
    });

    it("should return false when no docker indicators found", async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error("ENOENT"));

      const result = await (service as any).isRunningInDocker();

      expect(result).toBe(false);
    });
  });

  describe("private getDockerContainerStatus", () => {
    it("should return container info", async () => {
      // Mock docker version succeeds
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (typeof opts === "function") {
          callback = opts;
        }
        if (cmd.includes("docker --version")) {
          if (callback) {
            callback(null, { stdout: "Docker version 20.10.0" });
          }
          return { stdout: "Docker version 20.10.0" };
        }
        if (callback) {
          callback(null, { stdout: "" });
        }
        return { stdout: "" };
      });

      // Mock cgroup file read
      (fs.promises.readFile as jest.Mock).mockResolvedValueOnce(
        "1:name=systemd:/docker/abc123def456789abc123def456789abc123def456789abc123def456789abc1",
      );

      const result = await (service as any).getDockerContainerStatus();

      expect(result.isContainerized).toBe(true);
      expect(result).toHaveProperty("hostname");
    });

    it("should handle docker version command failure", async () => {
      mockExec.mockImplementation((_cmd, opts, callback) => {
        if (typeof opts === "function") {
          callback = opts;
        }
        if (callback) {
          callback(new Error("Command not found"), null);
        }
        throw new Error("Command not found");
      });

      // Mock cgroup read failure
      (fs.promises.readFile as jest.Mock).mockRejectedValueOnce(
        new Error("File not found"),
      );

      const result = await (service as any).getDockerContainerStatus();

      expect(result.isContainerized).toBe(true);
      // Should still return basic info without docker version
      expect(result).toHaveProperty("hostname");
    });
  });

  describe("private getSystemInfo", () => {
    it("should return system information", async () => {
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (typeof opts === "function") {
          callback = opts;
        }
        if (cmd.includes("df -BG")) {
          if (callback) {
            callback(null, { stdout: "/dev/sda1 100G 50G 50G 50% /" });
          }
          return { stdout: "/dev/sda1 100G 50G 50G 50% /" };
        }
        if (callback) {
          callback(null, { stdout: "" });
        }
        return { stdout: "" };
      });

      const result = await (service as any).getSystemInfo();

      expect(result).toHaveProperty("platform");
      expect(result).toHaveProperty("arch");
      expect(result).toHaveProperty("nodeVersion");
      expect(result).toHaveProperty("memory");
      expect(result.memory).toHaveProperty("total");
      expect(result.memory).toHaveProperty("free");
      expect(result.memory).toHaveProperty("used");
      expect(result.memory).toHaveProperty("usagePercentage");
      expect(result).toHaveProperty("cpu");
      expect(result.cpu).toHaveProperty("cores");
      expect(result.cpu).toHaveProperty("model");
      expect(result.cpu).toHaveProperty("loadAverage");
      expect(result).toHaveProperty("disk");
    });

    it("should handle disk info failure gracefully", async () => {
      mockExec.mockImplementation((_cmd, opts, callback) => {
        if (typeof opts === "function") {
          callback = opts;
        }
        if (callback) {
          callback(new Error("df command failed"), null);
        }
        throw new Error("df command failed");
      });

      const result = await (service as any).getSystemInfo();

      expect(result).toHaveProperty("platform");
      expect(result.disk.free).toBe(0);
      expect(result.disk.total).toBe(0);
    });
  });
});
