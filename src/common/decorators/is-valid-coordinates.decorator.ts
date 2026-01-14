import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

export interface CoordinateValidationOptions extends ValidationOptions {
  /**
   * Minimum number of coordinate points required (default: 4)
   */
  minPoints?: number;

  /**
   * Maximum number of coordinate points allowed (default: 1000)
   */
  maxPoints?: number;

  /**
   * Whether to enforce polygon closure (first point equals last point) (default: true)
   */
  requireClosure?: boolean;

  /**
   * Validate latitude bounds (-90 to 90) (default: true)
   */
  validateLatBounds?: boolean;

  /**
   * Validate longitude bounds (-180 to 180) (default: true)
   */
  validateLngBounds?: boolean;

  /**
   * Check for self-intersecting polygons (default: false)
   */
  checkSelfIntersection?: boolean;

  /**
   * Minimum area threshold for polygon validation (default: 0)
   */
  minArea?: number;

  /**
   * Check for duplicate consecutive points (default: false)
   */
  checkDuplicatePoints?: boolean;

  /**
   * Precision for coordinate comparison (default: 6 decimal places)
   */
  precision?: number;

  /**
   * Enable performance optimizations for large datasets (default: true)
   */
  enableOptimizations?: boolean;

  /**
   * Timeout in milliseconds for validation (default: 100ms)
   */
  timeoutMs?: number;

  /**
   * Sample size for large polygon intersection checks (default: 1000)
   */
  sampleSize?: number;
}

// Performance-optimized utility functions
class CoordinateUtils {
  private static readonly PRECISION_MULTIPLIERS = new Map<number, number>();

  static getPrecisionMultiplier(precision: number): number {
    if (!CoordinateUtils.PRECISION_MULTIPLIERS.has(precision)) {
      CoordinateUtils.PRECISION_MULTIPLIERS.set(precision, 10 ** precision);
    }
    return CoordinateUtils.PRECISION_MULTIPLIERS.get(precision)!;
  }

  // Fast coordinate validation using bitwise operations where possible
  static isValidLatitude(lat: number): boolean {
    return lat >= -90 && lat <= 90 && !Number.isNaN(lat);
  }

  static isValidLongitude(lng: number): boolean {
    return lng >= -180 && lng <= 180 && !Number.isNaN(lng);
  }

  // Optimized point equality check
  static arePointsEqual(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
    precision: number = 6,
  ): boolean {
    const multiplier = CoordinateUtils.getPrecisionMultiplier(precision);
    return (
      Math.round(point1.lat * multiplier) ===
        Math.round(point2.lat * multiplier) &&
      Math.round(point1.lng * multiplier) ===
        Math.round(point2.lng * multiplier)
    );
  }

  // Fast polygon area calculation using optimized Shoelace formula
  static calculatePolygonArea(
    coordinates: { lat: number; lng: number }[],
  ): number {
    let area = 0;
    const len = coordinates.length;

    for (let i = 0; i < len - 1; i++) {
      area +=
        coordinates[i].lng * coordinates[i + 1].lat -
        coordinates[i + 1].lng * coordinates[i].lat;
    }

    return Math.abs(area) * 0.5;
  }

  // Optimized line intersection using determinant calculation
  static doLinesIntersect(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
    p3: { lat: number; lng: number },
    p4: { lat: number; lng: number },
  ): boolean {
    const denom =
      (p1.lng - p2.lng) * (p3.lat - p4.lat) -
      (p1.lat - p2.lat) * (p3.lng - p4.lng);

    if (Math.abs(denom) < 1e-10) return false; // Parallel lines

    const t =
      ((p1.lng - p3.lng) * (p3.lat - p4.lat) -
        (p1.lat - p3.lat) * (p3.lng - p4.lng)) /
      denom;
    const u =
      -(
        (p1.lng - p2.lng) * (p1.lat - p3.lat) -
        (p1.lat - p2.lat) * (p1.lng - p3.lng)
      ) / denom;

    return t > 0 && t < 1 && u > 0 && u < 1;
  }

  // Spatial indexing for fast intersection detection
  static createSpatialIndex(coordinates: { lat: number; lng: number }[]) {
    const index = new Map<string, number[]>();
    const gridSize = Math.ceil(Math.sqrt(coordinates.length) / 10);

    coordinates.forEach((coord, i) => {
      const gridX = Math.floor(coord.lng * gridSize);
      const gridY = Math.floor(coord.lat * gridSize);
      const key = `${gridX},${gridY}`;

      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)?.push(i);
    });

    return { index, gridSize };
  }

  // Optimized self-intersection check with spatial indexing
  static hasSelfIntersection(
    coordinates: { lat: number; lng: number }[],
    sampleSize?: number,
  ): boolean {
    const len = coordinates.length;
    if (len < 4) return false;

    // For large polygons, use sampling
    if (sampleSize && len > sampleSize) {
      return CoordinateUtils.hasSelfIntersectionSampled(
        coordinates,
        sampleSize,
      );
    }

    // Use spatial indexing for medium-large polygons
    if (len > 100) {
      return CoordinateUtils.hasSelfIntersectionIndexed(coordinates);
    }

    // Direct comparison for small polygons
    return CoordinateUtils.hasSelfIntersectionDirect(coordinates);
  }

  private static hasSelfIntersectionDirect(
    coordinates: { lat: number; lng: number }[],
  ): boolean {
    const len = coordinates.length;

    for (let i = 0; i < len - 1; i++) {
      for (let j = i + 2; j < len - 1; j++) {
        // Skip adjacent edges and closing edge
        if (j === i + 1 || (i === 0 && j === len - 2)) continue;

        if (
          CoordinateUtils.doLinesIntersect(
            coordinates[i],
            coordinates[i + 1],
            coordinates[j],
            coordinates[j + 1],
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  private static hasSelfIntersectionIndexed(
    coordinates: { lat: number; lng: number }[],
  ): boolean {
    const { index, gridSize } = CoordinateUtils.createSpatialIndex(coordinates);
    const len = coordinates.length;

    for (let i = 0; i < len - 1; i++) {
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];

      // Get nearby grid cells
      const minX = Math.floor(Math.min(p1.lng, p2.lng) * gridSize) - 1;
      const maxX = Math.floor(Math.max(p1.lng, p2.lng) * gridSize) + 1;
      const minY = Math.floor(Math.min(p1.lat, p2.lat) * gridSize) - 1;
      const maxY = Math.floor(Math.max(p1.lat, p2.lat) * gridSize) + 1;

      for (let gx = minX; gx <= maxX; gx++) {
        for (let gy = minY; gy <= maxY; gy++) {
          const nearbyIndices = index.get(`${gx},${gy}`);
          if (!nearbyIndices) continue;

          for (const j of nearbyIndices) {
            if (j <= i + 1 || j >= len - 1) continue;
            if (i === 0 && j === len - 2) continue;

            if (
              CoordinateUtils.doLinesIntersect(
                p1,
                p2,
                coordinates[j],
                coordinates[j + 1],
              )
            ) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  private static hasSelfIntersectionSampled(
    coordinates: { lat: number; lng: number }[],
    sampleSize: number,
  ): boolean {
    const len = coordinates.length;
    const step = Math.floor(len / sampleSize);

    for (let i = 0; i < len - 1; i += step) {
      for (let j = i + 2 * step; j < len - 1; j += step) {
        if (j === i + step || (i === 0 && j >= len - step)) continue;

        if (
          CoordinateUtils.doLinesIntersect(
            coordinates[i],
            coordinates[i + 1],
            coordinates[j],
            coordinates[Math.min(j + 1, len - 1)],
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Parse coordinates from various formats
   * Handles:
   * 1. Direct array of {lat, lng} objects
   * 2. FormData indexed format: coordinates[0][lat], coordinates[0][lng]
   * 3. FormData array format: coordinates.lat[], coordinates.lng[]
   */
  static parseCoordinates(
    coordinatesData: any,
  ): { lat: number; lng: number }[] {
    if (!coordinatesData) return [];

    // Handle direct array of coordinate objects (most common case)
    if (Array.isArray(coordinatesData)) {
      const coordinates: { lat: number; lng: number }[] = [];

      for (const coord of coordinatesData) {
        if (coord && typeof coord === "object") {
          const lat = Number(coord.lat);
          const lng = Number(coord.lng);

          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            coordinates.push({ lat, lng });
          }
        }
      }

      return coordinates;
    }

    // Handle FormData indexed format: coordinates[0][lat], coordinates[0][lng]
    if (
      typeof coordinatesData === "object" &&
      !Array.isArray(coordinatesData)
    ) {
      const coordinates: { lat: number; lng: number }[] = [];
      const indices = new Set<number>();

      // Extract all indices from the keys
      Object.keys(coordinatesData).forEach((key) => {
        const match = key.match(/^(\d+)$/);
        if (match) {
          indices.add(parseInt(match[1], 10));
        }
      });

      // Sort indices and build coordinate array
      Array.from(indices)
        .sort((a, b) => a - b)
        .forEach((index) => {
          const coordData = coordinatesData[index];
          if (
            coordData &&
            coordData.lat !== undefined &&
            coordData.lng !== undefined
          ) {
            const lat = Number(coordData.lat);
            const lng = Number(coordData.lng);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
              coordinates.push({ lat, lng });
            }
          }
        });

      if (coordinates.length > 0) {
        return coordinates;
      }

      // Handle old format: coordinates.lat[], coordinates.lng[]
      if (
        coordinatesData.lat &&
        coordinatesData.lng &&
        Array.isArray(coordinatesData.lat) &&
        Array.isArray(coordinatesData.lng)
      ) {
        const coords: { lat: number; lng: number }[] = [];
        const length = Math.min(
          coordinatesData.lat.length,
          coordinatesData.lng.length,
        );

        for (let i = 0; i < length; i++) {
          const lat = Number(coordinatesData.lat[i]);
          const lng = Number(coordinatesData.lng[i]);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            coords.push({ lat, lng });
          }
        }

        return coords;
      }
    }

    return [];
  }

  // Backward compatibility - keep the old function name
  static parseIndexedCoordinates(
    coordinatesData: any,
  ): { lat: number; lng: number }[] {
    return CoordinateUtils.parseCoordinates(coordinatesData);
  }
}

// Timeout wrapper for long-running operations
class TimeoutValidator {
  private startTime: number;
  private timeoutMs: number;

  constructor(timeoutMs: number = 100) {
    this.startTime = Date.now();
    this.timeoutMs = timeoutMs;
  }

  checkTimeout(): boolean {
    return Date.now() - this.startTime > this.timeoutMs;
  }

  throwIfTimeout(): void {
    if (this.checkTimeout()) {
      throw new Error("Validation timeout exceeded");
    }
  }
}

export function IsValidCoordinates(
  validationOptions?: CoordinateValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isValidCoordinates",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(coordinatesData: any, args: ValidationArguments) {
          const options = validationOptions || {};
          const {
            minPoints = 4,
            maxPoints = 1000,
            requireClosure = true,
            validateLatBounds = true,
            validateLngBounds = true,
            checkSelfIntersection = false,
            minArea = 0,
            checkDuplicatePoints = false,
            precision = 6,
            enableOptimizations = true,
            timeoutMs = 100,
            sampleSize = 1000,
          } = options;

          const timer = new TimeoutValidator(timeoutMs);

          try {
            // Handle null/undefined
            if (!coordinatesData) {
              return false;
            }

            // Parse coordinates using the updated utility function
            const coordinates =
              CoordinateUtils.parseCoordinates(coordinatesData);

            // Quick validation checks first
            if (coordinates.length === 0) {
              return false;
            }

            if (
              coordinates.length < minPoints ||
              coordinates.length > maxPoints
            ) {
              return false;
            }

            timer.throwIfTimeout();

            // Validate each coordinate
            for (let i = 0; i < coordinates.length; i++) {
              const { lat, lng } = coordinates[i];

              if (validateLatBounds && !CoordinateUtils.isValidLatitude(lat)) {
                return false;
              }
              if (validateLngBounds && !CoordinateUtils.isValidLongitude(lng)) {
                return false;
              }

              // Periodic timeout check for large datasets
              if (enableOptimizations && i % 100 === 0) {
                timer.throwIfTimeout();
              }
            }

            timer.throwIfTimeout();

            // Check for duplicate consecutive points (optimized)
            if (checkDuplicatePoints) {
              for (let i = 1; i < coordinates.length; i++) {
                if (
                  CoordinateUtils.arePointsEqual(
                    coordinates[i],
                    coordinates[i - 1],
                    precision,
                  )
                ) {
                  return false;
                }

                if (enableOptimizations && i % 50 === 0) {
                  timer.throwIfTimeout();
                }
              }
            }

            // Check polygon closure
            if (requireClosure && coordinates.length >= 3) {
              if (
                !CoordinateUtils.arePointsEqual(
                  coordinates[0],
                  coordinates[coordinates.length - 1],
                  precision,
                )
              ) {
                return false;
              }
            }

            timer.throwIfTimeout();

            // Check for self-intersecting polygons (most expensive operation)
            if (checkSelfIntersection && coordinates.length >= 4) {
              if (
                CoordinateUtils.hasSelfIntersection(
                  coordinates,
                  enableOptimizations ? sampleSize : undefined,
                )
              ) {
                return false;
              }
            }

            timer.throwIfTimeout();

            // Check minimum area
            if (minArea > 0 && coordinates.length >= 4) {
              const area = CoordinateUtils.calculatePolygonArea(coordinates);
              if (area < minArea) {
                return false;
              }
            }

            return true;
          } catch (error) {
            // Timeout or other validation error
            if (error instanceof Error && error.message.includes("timeout")) {
              console.warn(
                `Coordinate validation timeout for ${args.property}`,
              );
              return false;
            }
            console.error("Validation error:", error);
            throw error;
          }
        },

        defaultMessage(args: ValidationArguments) {
          const options = validationOptions || {};

          // Try to provide more specific error messages based on the actual data
          if (!args.value) {
            return `${args.property} is required`;
          }

          const coordinates = CoordinateUtils.parseCoordinates(args.value);

          if (coordinates.length === 0) {
            return `${args.property} must contain valid coordinate data`;
          }

          if (coordinates.length < (options.minPoints || 4)) {
            return `${args.property} must have at least ${options.minPoints || 4} coordinate points`;
          }

          if (coordinates.length > (options.maxPoints || 1000)) {
            return `${args.property} must have at most ${options.maxPoints || 1000} coordinate points`;
          }

          const messages: string[] = [];
          messages.push(`${args.property} must be valid coordinates`);

          if (options.requireClosure !== false) {
            messages.push("with closure (first point equals last point)");
          }

          if (options.validateLatBounds !== false) {
            messages.push("latitude values between -90 and 90");
          }

          if (options.validateLngBounds !== false) {
            messages.push("longitude values between -180 and 180");
          }

          if (options.checkSelfIntersection) {
            messages.push("without self-intersections");
          }

          if (options.minArea && options.minArea > 0) {
            messages.push(`minimum area of ${options.minArea}`);
          }

          if (options.checkDuplicatePoints) {
            messages.push("without duplicate consecutive points");
          }

          return messages.join(", ");
        },
      },
    });
  };
}

// Enhanced utility decorators with performance optimizations

/**
 * Validates coordinates as a high-performance simple polygon
 */
export function IsValidPolygon(validationOptions?: ValidationOptions) {
  return IsValidCoordinates({
    ...validationOptions,
    requireClosure: true,
    checkSelfIntersection: true,
    minPoints: 4,
    enableOptimizations: true,
    timeoutMs: 80,
  });
}

/**
 * Validates coordinates as a line string with performance optimizations
 */
export function IsValidLineString(validationOptions?: ValidationOptions) {
  return IsValidCoordinates({
    ...validationOptions,
    requireClosure: false,
    minPoints: 2,
    checkSelfIntersection: false,
    enableOptimizations: true,
    timeoutMs: 50,
  });
}

/**
 * Validates coordinates with strict bounds and performance optimizations
 */
export function IsValidStrictCoordinates(
  validationOptions?: ValidationOptions,
) {
  return IsValidCoordinates({
    ...validationOptions,
    validateLatBounds: true,
    validateLngBounds: true,
    checkDuplicatePoints: true,
    precision: 6,
    enableOptimizations: true,
    timeoutMs: 80,
  });
}

/**
 * High-performance validator for large polygon coordinates
 */
export function IsValidLargePolygon(
  validationOptions?: CoordinateValidationOptions,
) {
  return IsValidCoordinates({
    minPoints: 4,
    maxPoints: 50000,
    requireClosure: true,
    checkSelfIntersection: true,
    checkDuplicatePoints: false,
    precision: 4,
    enableOptimizations: true,
    timeoutMs: 90,
    sampleSize: 500,
    ...validationOptions, // Allow overriding defaults
  });
}

/**
 * Ultra-fast validator for simple coordinate validation
 */
export function IsValidFastCoordinates(validationOptions?: ValidationOptions) {
  return IsValidCoordinates({
    ...validationOptions,
    checkSelfIntersection: false,
    checkDuplicatePoints: false,
    minArea: 0,
    precision: 4,
    enableOptimizations: true,
    timeoutMs: 30,
  });
}

/**
 * Real-time validator optimized for streaming coordinate data
 */
export function IsValidRealtimeCoordinates(
  validationOptions?: ValidationOptions,
) {
  return IsValidCoordinates({
    ...validationOptions,
    maxPoints: 1000,
    checkSelfIntersection: false,
    checkDuplicatePoints: true,
    precision: 4,
    enableOptimizations: true,
    timeoutMs: 20,
  });
}
