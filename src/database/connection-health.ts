import { DataSource } from "typeorm";

export interface ConnectionHealthStatus {
  isHealthy: boolean;
  isInitialized: boolean;
  hasDriver: boolean;
  canConnect: boolean;
  poolStats?: {
    total: number;
    idle: number;
    waiting: number;
  };
  error?: string;
}

/**
 * Check the health of a TypeORM DataSource connection
 */
export async function checkConnectionHealth(
  dataSource: DataSource,
): Promise<ConnectionHealthStatus> {
  const status: ConnectionHealthStatus = {
    isHealthy: false,
    isInitialized: false,
    hasDriver: false,
    canConnect: false,
  };

  try {
    // Check if DataSource is initialized
    status.isInitialized = dataSource.isInitialized;

    if (!status.isInitialized) {
      status.error = "DataSource is not initialized";
      return status;
    }

    // Check if driver exists
    status.hasDriver = !!dataSource.driver;

    if (!status.hasDriver) {
      status.error = "DataSource driver is not available";
      return status;
    }

    // Try to get connection pool stats
    try {
      const driver = dataSource.driver as any;
      if (driver.master) {
        const poolSize = driver.master._clients?.length || 0;
        const idleCount = driver.master._idle?.length || 0;
        const waitingCount = driver.master._pendingQueue?.length || 0;

        status.poolStats = {
          total: poolSize,
          idle: idleCount,
          waiting: waitingCount,
        };
      }
    } catch (_error) {
      // Pool stats are optional, don't fail if we can't get them
      status.error = "Could not retrieve pool stats";
    }

    // Try a simple query to verify connection works
    try {
      await dataSource.query("SELECT 1");
      status.canConnect = true;
      status.isHealthy = true;
    } catch (error: any) {
      status.error = `Connection test failed: ${error.message}`;
      status.canConnect = false;
    }
  } catch (error: any) {
    status.error = `Health check failed: ${error.message}`;
  }

  return status;
}

/**
 * Wait for the DataSource to become healthy
 * @param dataSource The DataSource to check
 * @param maxRetries Maximum number of retry attempts
 * @param delayMs Delay between retries in milliseconds
 */
export async function waitForHealthyConnection(
  dataSource: DataSource,
  maxRetries = 5,
  delayMs = 1000,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const health = await checkConnectionHealth(dataSource);

    if (health.isHealthy) {
      return true;
    }

    if (attempt < maxRetries) {
      console.log(
        `Connection not healthy (attempt ${attempt}/${maxRetries}): ${health.error}. Retrying in ${delayMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return false;
}

/**
 * Retry a database operation with exponential backoff
 * @param operation The async operation to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelayMs Base delay in milliseconds (will be exponentially increased)
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection error that warrants retry
      const isConnectionError =
        error.message?.includes("Driver not Connected") ||
        error.message?.includes("Connection") ||
        error.message?.includes("pool") ||
        error.name === "TypeORMError";

      if (isConnectionError && attempt < maxRetries) {
        // Exponential backoff
        const delay = baseDelayMs * 2 ** (attempt - 1);
        console.warn(
          `Database operation failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Non-connection error or max retries reached
        throw error;
      }
    }
  }

  throw lastError;
}

/**
 * Ensure DataSource is ready for operations
 * Throws an error if the connection is not healthy
 */
export async function ensureConnectionReady(
  dataSource: DataSource,
): Promise<void> {
  const health = await checkConnectionHealth(dataSource);

  if (!health.isHealthy) {
    throw new Error(
      `DataSource is not ready: ${health.error || "Unknown error"}`,
    );
  }
}
