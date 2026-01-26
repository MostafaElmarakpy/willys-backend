import { INestApplication } from "@nestjs/common";
import { User } from "../../src/database/entities/user.entity";
import { AuthTokens, registerUser } from "./auth.helper";

export interface StressTestConfig {
  concurrentUsers: number;
  operationsPerUser?: number;
  rampUpTimeMs?: number;
  maxDurationMs?: number;
}

export interface OperationResult {
  success: boolean;
  latencyMs: number;
  status?: number;
  error?: string;
  data?: any;
}

export interface StressTestResult {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  operationsPerSecond: number;
  totalDurationMs: number;
  errors: Array<{ operation: string; error: string; timestamp: Date }>;
  results: OperationResult[];
}

export interface UserWithTokens {
  user: User;
  tokens: AuthTokens;
}

/**
 * Create multiple users concurrently for stress testing
 */
export async function createConcurrentUsers(
  app: INestApplication,
  count: number,
  baseEmail?: string,
): Promise<UserWithTokens[]> {
  const userPromises = Array.from({ length: count }, (_, i) =>
    registerUser(app, {
      fullName: `Stress Test User ${i + 1}`,
      email: baseEmail
        ? `${baseEmail.replace("@", `${i + 1}@`)}`
        : `stressuser${i + 1}_${Date.now()}@test.com`,
      password: "Test@1234",
    }),
  );

  return Promise.all(userPromises);
}

/**
 * Measure the latency of an async operation
 */
export async function measureLatency<T>(
  operation: () => Promise<T>,
): Promise<{ result: T; latencyMs: number }> {
  const start = performance.now();
  const result = await operation();
  const latencyMs = performance.now() - start;
  return { result, latencyMs };
}

/**
 * Run multiple operations concurrently and collect results
 */
export async function runConcurrentOperations<T>(
  operations: Array<() => Promise<T>>,
  config?: { rampUpTimeMs?: number },
): Promise<Array<{ result: T | null; latencyMs: number; error?: string }>> {
  const rampUpTimeMs = config?.rampUpTimeMs || 0;
  const delayPerOp =
    operations.length > 1 ? rampUpTimeMs / (operations.length - 1) : 0;

  const wrappedOperations = operations.map((op, index) => async () => {
    if (delayPerOp > 0 && index > 0) {
      await sleep(delayPerOp * index);
    }

    const start = performance.now();
    try {
      const result = await op();
      return {
        result,
        latencyMs: performance.now() - start,
      };
    } catch (error: any) {
      return {
        result: null,
        latencyMs: performance.now() - start,
        error: error.message || String(error),
      };
    }
  });

  return Promise.all(wrappedOperations.map((op) => op()));
}

/**
 * Run operations with staggered start times
 */
export async function runStaggeredOperations<T>(
  operations: Array<() => Promise<T>>,
  intervalMs: number,
): Promise<Array<{ result: T | null; latencyMs: number; error?: string }>> {
  const results: Array<{
    result: T | null;
    latencyMs: number;
    error?: string;
  }> = [];

  const promises = operations.map(async (op, index) => {
    await sleep(intervalMs * index);
    const start = performance.now();
    try {
      const result = await op();
      results[index] = {
        result,
        latencyMs: performance.now() - start,
      };
    } catch (error: any) {
      results[index] = {
        result: null,
        latencyMs: performance.now() - start,
        error: error.message || String(error),
      };
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Run operations simultaneously (all start at the same time)
 */
export async function runSimultaneousOperations<T>(
  operations: Array<() => Promise<T>>,
): Promise<Array<{ result: T | null; latencyMs: number; error?: string }>> {
  return runConcurrentOperations(operations, { rampUpTimeMs: 0 });
}

/**
 * Calculate stress test metrics from operation results
 */
export function calculateStressMetrics(
  results: Array<{
    result: any;
    latencyMs: number;
    error?: string;
    success?: boolean;
  }>,
  totalDurationMs: number,
): StressTestResult {
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const successfulOps = results.filter(
    (r) => !r.error && (r.success === undefined || r.success),
  );
  const failedOps = results.filter(
    (r) => r.error || (r.success !== undefined && !r.success),
  );

  const errors = failedOps
    .filter((r) => r.error)
    .map((r) => ({
      operation: "unknown",
      error: r.error!,
      timestamp: new Date(),
    }));

  return {
    totalOperations: results.length,
    successfulOperations: successfulOps.length,
    failedOperations: failedOps.length,
    averageLatencyMs:
      latencies.length > 0
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length
        : 0,
    minLatencyMs: latencies.length > 0 ? latencies[0] : 0,
    maxLatencyMs: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
    p50LatencyMs: calculatePercentile(latencies, 50),
    p95LatencyMs: calculatePercentile(latencies, 95),
    p99LatencyMs: calculatePercentile(latencies, 99),
    operationsPerSecond:
      totalDurationMs > 0 ? (results.length / totalDurationMs) * 1000 : 0,
    totalDurationMs,
    errors,
    results: results.map((r) => ({
      success: !r.error && (r.success === undefined || r.success),
      latencyMs: r.latencyMs,
      error: r.error,
      data: r.result,
    })),
  };
}

/**
 * Calculate percentile from sorted array
 */
export function calculatePercentile(
  sortedValues: number[],
  percentile: number,
): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate unique idempotency key
 */
export function generateIdempotencyKey(prefix?: string): string {
  return `${prefix || "checkout"}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * 2 ** attempt;
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Run a stress test with full metrics collection
 */
export async function runStressTest<T>(
  operations: Array<() => Promise<T>>,
  config: StressTestConfig = { concurrentUsers: 10 },
): Promise<StressTestResult> {
  const startTime = performance.now();

  const results = await runConcurrentOperations(operations, {
    rampUpTimeMs: config.rampUpTimeMs,
  });

  const totalDurationMs = performance.now() - startTime;

  return calculateStressMetrics(
    results.map((r) => ({
      result: r.result,
      latencyMs: r.latencyMs,
      error: r.error,
      success: !r.error,
    })),
    totalDurationMs,
  );
}

/**
 * Assert stress test results meet expectations
 */
export function assertStressTestResults(
  results: StressTestResult,
  expectations: {
    minSuccessRate?: number;
    maxP95LatencyMs?: number;
    maxP99LatencyMs?: number;
    minOperationsPerSecond?: number;
  },
): void {
  const successRate =
    results.totalOperations > 0
      ? results.successfulOperations / results.totalOperations
      : 0;

  if (
    expectations.minSuccessRate !== undefined &&
    successRate < expectations.minSuccessRate
  ) {
    throw new Error(
      `Success rate ${(successRate * 100).toFixed(1)}% is below minimum ${expectations.minSuccessRate * 100}%`,
    );
  }

  if (
    expectations.maxP95LatencyMs !== undefined &&
    results.p95LatencyMs > expectations.maxP95LatencyMs
  ) {
    throw new Error(
      `P95 latency ${results.p95LatencyMs.toFixed(0)}ms exceeds maximum ${expectations.maxP95LatencyMs}ms`,
    );
  }

  if (
    expectations.maxP99LatencyMs !== undefined &&
    results.p99LatencyMs > expectations.maxP99LatencyMs
  ) {
    throw new Error(
      `P99 latency ${results.p99LatencyMs.toFixed(0)}ms exceeds maximum ${expectations.maxP99LatencyMs}ms`,
    );
  }

  if (
    expectations.minOperationsPerSecond !== undefined &&
    results.operationsPerSecond < expectations.minOperationsPerSecond
  ) {
    throw new Error(
      `Operations per second ${results.operationsPerSecond.toFixed(1)} is below minimum ${expectations.minOperationsPerSecond}`,
    );
  }
}
