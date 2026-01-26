import { getTestDataSource } from "../setup/test-app";
import { StressTestResult } from "./stress.helper";

export interface DatabaseMetrics {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  waitingConnections: number;
  maxConnections: number;
}

export interface QueryMetrics {
  totalQueries: number;
  slowQueries: number;
  averageQueryTimeMs: number;
}

export interface LockMetrics {
  activeLocks: number;
  waitingLocks: number;
  deadlocks: number;
}

/**
 * Get current database connection pool statistics
 */
export async function getConnectionPoolStats(): Promise<DatabaseMetrics> {
  const dataSource = getTestDataSource();

  try {
    // Query pg_stat_activity for connection information
    const result = await dataSource.query(`
      SELECT
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) as total_connections,
        count(*) FILTER (WHERE wait_event_type = 'Lock') as waiting_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    const maxConnResult = await dataSource.query(`
      SHOW max_connections
    `);

    return {
      activeConnections: parseInt(result[0]?.active_connections || "0", 10),
      idleConnections: parseInt(result[0]?.idle_connections || "0", 10),
      totalConnections: parseInt(result[0]?.total_connections || "0", 10),
      waitingConnections: parseInt(result[0]?.waiting_connections || "0", 10),
      maxConnections: parseInt(maxConnResult[0]?.max_connections || "100", 10),
    };
  } catch (_error) {
    // Return default values if query fails
    return {
      activeConnections: 0,
      idleConnections: 0,
      totalConnections: 0,
      waitingConnections: 0,
      maxConnections: 100,
    };
  }
}

/**
 * Get current lock statistics
 */
export async function getLockStats(): Promise<LockMetrics> {
  const dataSource = getTestDataSource();

  try {
    const result = await dataSource.query(`
      SELECT
        count(*) FILTER (WHERE granted = true) as active_locks,
        count(*) FILTER (WHERE granted = false) as waiting_locks
      FROM pg_locks
      WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
    `);

    return {
      activeLocks: parseInt(result[0]?.active_locks || "0", 10),
      waitingLocks: parseInt(result[0]?.waiting_locks || "0", 10),
      deadlocks: 0, // Deadlocks are typically logged, not queried directly
    };
  } catch (_error) {
    return {
      activeLocks: 0,
      waitingLocks: 0,
      deadlocks: 0,
    };
  }
}

/**
 * Check for any blocking queries
 */
export async function getBlockingQueries(): Promise<
  Array<{
    blockedPid: number;
    blockingPid: number;
    blockedQuery: string;
    blockingQuery: string;
  }>
> {
  const dataSource = getTestDataSource();

  try {
    const result = await dataSource.query(`
      SELECT
        blocked.pid as blocked_pid,
        blocking.pid as blocking_pid,
        blocked.query as blocked_query,
        blocking.query as blocking_query
      FROM pg_stat_activity blocked
      JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
      JOIN pg_locks blocking_locks ON blocked_locks.locktype = blocking_locks.locktype
        AND blocked_locks.database IS NOT DISTINCT FROM blocking_locks.database
        AND blocked_locks.relation IS NOT DISTINCT FROM blocking_locks.relation
        AND blocked_locks.page IS NOT DISTINCT FROM blocking_locks.page
        AND blocked_locks.tuple IS NOT DISTINCT FROM blocking_locks.tuple
        AND blocked_locks.virtualxid IS NOT DISTINCT FROM blocking_locks.virtualxid
        AND blocked_locks.transactionid IS NOT DISTINCT FROM blocking_locks.transactionid
        AND blocked_locks.classid IS NOT DISTINCT FROM blocking_locks.classid
        AND blocked_locks.objid IS NOT DISTINCT FROM blocking_locks.objid
        AND blocked_locks.objsubid IS NOT DISTINCT FROM blocking_locks.objsubid
        AND blocked_locks.pid != blocking_locks.pid
      JOIN pg_stat_activity blocking ON blocking_locks.pid = blocking.pid
      WHERE NOT blocked_locks.granted
      LIMIT 10
    `);

    return result.map((row: any) => ({
      blockedPid: row.blocked_pid,
      blockingPid: row.blocking_pid,
      blockedQuery: row.blocked_query,
      blockingQuery: row.blocking_query,
    }));
  } catch (_error) {
    return [];
  }
}

/**
 * Wait for all connections to return to idle state
 */
export async function waitForConnectionPoolDrain(
  maxWaitMs: number = 5000,
): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 100;

  while (Date.now() - startTime < maxWaitMs) {
    const stats = await getConnectionPoolStats();
    if (stats.activeConnections <= 1) {
      // Allow for the current query connection
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return false;
}

/**
 * Format stress test results for logging/display
 */
export function formatStressResults(results: StressTestResult): string {
  const successRate =
    results.totalOperations > 0
      ? (
          (results.successfulOperations / results.totalOperations) *
          100
        ).toFixed(1)
      : "0";

  return `
╔══════════════════════════════════════════════════════════════╗
║                    STRESS TEST RESULTS                       ║
╠══════════════════════════════════════════════════════════════╣
║  Total Operations:     ${String(results.totalOperations).padStart(8)}                           ║
║  Successful:           ${String(results.successfulOperations).padStart(8)} (${successRate}%)                     ║
║  Failed:               ${String(results.failedOperations).padStart(8)}                           ║
╠══════════════════════════════════════════════════════════════╣
║  LATENCY METRICS (ms)                                        ║
║  ─────────────────────────────────────────────────────────── ║
║  Min:                  ${String(results.minLatencyMs.toFixed(0)).padStart(8)}                           ║
║  Avg:                  ${String(results.averageLatencyMs.toFixed(0)).padStart(8)}                           ║
║  P50:                  ${String(results.p50LatencyMs.toFixed(0)).padStart(8)}                           ║
║  P95:                  ${String(results.p95LatencyMs.toFixed(0)).padStart(8)}                           ║
║  P99:                  ${String(results.p99LatencyMs.toFixed(0)).padStart(8)}                           ║
║  Max:                  ${String(results.maxLatencyMs.toFixed(0)).padStart(8)}                           ║
╠══════════════════════════════════════════════════════════════╣
║  THROUGHPUT                                                  ║
║  ─────────────────────────────────────────────────────────── ║
║  Total Duration:       ${String(results.totalDurationMs.toFixed(0)).padStart(8)} ms                       ║
║  Operations/sec:       ${String(results.operationsPerSecond.toFixed(2)).padStart(8)}                           ║
╚══════════════════════════════════════════════════════════════╝
${
  results.errors.length > 0
    ? `\nErrors (${results.errors.length}):\n${results.errors
        .slice(0, 5)
        .map((e) => `  - ${e.error}`)
        .join("\n")}`
    : ""
}
  `.trim();
}

/**
 * Log metrics summary for a test
 */
export function logMetricsSummary(
  testName: string,
  results: StressTestResult,
): void {
  console.log(`\n[${testName}]`);
  console.log(formatStressResults(results));
}

/**
 * Create a metrics collector for tracking metrics over time
 */
export function createMetricsCollector() {
  const snapshots: Array<{
    timestamp: Date;
    connections: DatabaseMetrics;
    locks: LockMetrics;
  }> = [];

  return {
    async capture(): Promise<void> {
      const [connections, locks] = await Promise.all([
        getConnectionPoolStats(),
        getLockStats(),
      ]);
      snapshots.push({
        timestamp: new Date(),
        connections,
        locks,
      });
    },

    getSnapshots() {
      return [...snapshots];
    },

    clear() {
      snapshots.length = 0;
    },

    getSummary() {
      if (snapshots.length === 0) {
        return null;
      }

      const maxActiveConnections = Math.max(
        ...snapshots.map((s) => s.connections.activeConnections),
      );
      const maxWaitingLocks = Math.max(
        ...snapshots.map((s) => s.locks.waitingLocks),
      );
      const avgActiveConnections =
        snapshots.reduce((sum, s) => sum + s.connections.activeConnections, 0) /
        snapshots.length;

      return {
        snapshotCount: snapshots.length,
        maxActiveConnections,
        maxWaitingLocks,
        avgActiveConnections: Math.round(avgActiveConnections * 100) / 100,
      };
    },
  };
}

/**
 * Assert database metrics are within acceptable bounds
 */
export function assertDatabaseMetrics(
  metrics: DatabaseMetrics,
  expectations: {
    maxActiveConnections?: number;
    maxTotalConnections?: number;
    maxWaitingConnections?: number;
  },
): void {
  if (
    expectations.maxActiveConnections !== undefined &&
    metrics.activeConnections > expectations.maxActiveConnections
  ) {
    throw new Error(
      `Active connections (${metrics.activeConnections}) exceed maximum (${expectations.maxActiveConnections})`,
    );
  }

  if (
    expectations.maxTotalConnections !== undefined &&
    metrics.totalConnections > expectations.maxTotalConnections
  ) {
    throw new Error(
      `Total connections (${metrics.totalConnections}) exceed maximum (${expectations.maxTotalConnections})`,
    );
  }

  if (
    expectations.maxWaitingConnections !== undefined &&
    metrics.waitingConnections > expectations.maxWaitingConnections
  ) {
    throw new Error(
      `Waiting connections (${metrics.waitingConnections}) exceed maximum (${expectations.maxWaitingConnections})`,
    );
  }
}
