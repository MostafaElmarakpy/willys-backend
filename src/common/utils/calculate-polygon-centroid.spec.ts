import type { Coordinate } from "../classes/coordinates";
import { calculatePolygonCentroid } from "./calculate-polygon-centroid";

describe("Calculate Polygon Centroid", () => {
  describe("Empty coordinates", () => {
    it("should throw error for empty coordinates array", () => {
      expect(() => {
        calculatePolygonCentroid([]);
      }).toThrow("Coordinates array cannot be empty");
    });
  });

  describe("Single point", () => {
    it("should return the point itself for single coordinate", () => {
      const coordinates: Coordinate[] = [{ lat: 30.0, lng: 31.0 }];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBe(30.0);
      expect(centroid.lng).toBe(31.0);
    });

    it("should handle string coordinates for single point", () => {
      const coordinates: Coordinate[] = [
        { lat: "30.5" as any, lng: "31.5" as any },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBe(30.5);
      expect(centroid.lng).toBe(31.5);
    });
  });

  describe("Two points (line)", () => {
    it("should return midpoint for two coordinates", () => {
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 0 },
        { lat: 10, lng: 10 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBe(5);
      expect(centroid.lng).toBe(5);
    });

    it("should handle negative coordinates", () => {
      const coordinates: Coordinate[] = [
        { lat: -10, lng: -10 },
        { lat: 10, lng: 10 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBe(0);
      expect(centroid.lng).toBe(0);
    });
  });

  describe("Three points (triangle)", () => {
    it("should return average for three coordinates", () => {
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 6 },
        { lat: 6, lng: 0 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBe(2);
      expect(centroid.lng).toBe(2);
    });
  });

  describe("Four or more points (polygon)", () => {
    it("should calculate centroid for square polygon", () => {
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
        { lat: 0, lng: 0 }, // Closed
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(5, 5);
      expect(centroid.lng).toBeCloseTo(5, 5);
    });

    it("should calculate centroid for rectangle polygon", () => {
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 20 },
        { lat: 10, lng: 20 },
        { lat: 10, lng: 0 },
        { lat: 0, lng: 0 }, // Closed
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(5, 5);
      expect(centroid.lng).toBeCloseTo(10, 5);
    });

    it("should handle non-closed polygon", () => {
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(5, 5);
      expect(centroid.lng).toBeCloseTo(5, 5);
    });

    it("should handle irregular polygon", () => {
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 5, lng: 15 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
        { lat: 0, lng: 0 }, // Closed
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      // Centroid should be within the bounds of the polygon
      expect(centroid.lat).toBeGreaterThanOrEqual(0);
      expect(centroid.lat).toBeLessThanOrEqual(10);
      expect(centroid.lng).toBeGreaterThanOrEqual(0);
      expect(centroid.lng).toBeLessThanOrEqual(15);
    });
  });

  describe("String coordinates", () => {
    it("should parse string coordinates correctly", () => {
      const coordinates: Coordinate[] = [
        { lat: "0" as any, lng: "0" as any },
        { lat: "0" as any, lng: "10" as any },
        { lat: "10" as any, lng: "10" as any },
        { lat: "10" as any, lng: "0" as any },
        { lat: "0" as any, lng: "0" as any },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(5, 5);
      expect(centroid.lng).toBeCloseTo(5, 5);
    });

    it("should handle mixed string and number coordinates", () => {
      const coordinates: Coordinate[] = [
        { lat: 0, lng: "0" as any },
        { lat: "0" as any, lng: 10 },
        { lat: 10, lng: "10" as any },
        { lat: "10" as any, lng: 0 },
        { lat: 0, lng: "0" as any },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(5, 5);
      expect(centroid.lng).toBeCloseTo(5, 5);
    });
  });

  describe("Degenerate cases (near-zero area)", () => {
    it("should handle collinear points (line)", () => {
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 0 },
        { lat: 5, lng: 5 },
        { lat: 10, lng: 10 },
        { lat: 15, lng: 15 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      // For collinear points (zero area), should return average
      expect(centroid.lat).toBeCloseTo(7.5, 5);
      expect(centroid.lng).toBeCloseTo(7.5, 5);
    });

    it("should handle very small polygon", () => {
      const epsilon = 1e-12;
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 0 },
        { lat: epsilon, lng: 0 },
        { lat: epsilon, lng: epsilon },
        { lat: 0, lng: epsilon },
        { lat: 0, lng: 0 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      // Should return average for near-zero area
      expect(typeof centroid.lat).toBe("number");
      expect(typeof centroid.lng).toBe("number");
    });
  });

  describe("Real-world coordinates", () => {
    it("should handle geographical coordinates (Egypt area)", () => {
      const coordinates: Coordinate[] = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.0, lng: 31.5 },
        { lat: 30.5, lng: 31.5 },
        { lat: 30.5, lng: 31.0 },
        { lat: 30.0, lng: 31.0 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(30.25, 5);
      expect(centroid.lng).toBeCloseTo(31.25, 5);
    });

    it("should handle negative longitude (Western hemisphere)", () => {
      const coordinates: Coordinate[] = [
        { lat: 40.0, lng: -74.0 },
        { lat: 40.0, lng: -73.5 },
        { lat: 40.5, lng: -73.5 },
        { lat: 40.5, lng: -74.0 },
        { lat: 40.0, lng: -74.0 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(40.25, 5);
      expect(centroid.lng).toBeCloseTo(-73.75, 5);
    });

    it("should handle negative latitude (Southern hemisphere)", () => {
      const coordinates: Coordinate[] = [
        { lat: -33.9, lng: 18.4 },
        { lat: -33.9, lng: 18.5 },
        { lat: -33.8, lng: 18.5 },
        { lat: -33.8, lng: 18.4 },
        { lat: -33.9, lng: 18.4 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(-33.85, 5);
      expect(centroid.lng).toBeCloseTo(18.45, 5);
    });
  });

  describe("Complex polygons", () => {
    it("should handle pentagon", () => {
      // Regular pentagon-like shape
      const coordinates: Coordinate[] = [
        { lat: 0, lng: 5 },
        { lat: 4.76, lng: 1.55 },
        { lat: 2.94, lng: -4.05 },
        { lat: -2.94, lng: -4.05 },
        { lat: -4.76, lng: 1.55 },
        { lat: 0, lng: 5 },
      ];

      const centroid = calculatePolygonCentroid(coordinates);

      // Centroid should be near center (0, 0) for this symmetric shape
      expect(Math.abs(centroid.lat)).toBeLessThan(0.5);
      expect(Math.abs(centroid.lng)).toBeLessThan(0.5);
    });

    it("should handle large polygon with many points", () => {
      // Generate a circle-like polygon with many points
      const numPoints = 100;
      const coordinates: Coordinate[] = [];
      const radius = 10;
      const centerLat = 30;
      const centerLng = 31;

      for (let i = 0; i <= numPoints; i++) {
        const angle = (2 * Math.PI * i) / numPoints;
        coordinates.push({
          lat: centerLat + radius * Math.sin(angle),
          lng: centerLng + radius * Math.cos(angle),
        });
      }

      const centroid = calculatePolygonCentroid(coordinates);

      expect(centroid.lat).toBeCloseTo(centerLat, 1);
      expect(centroid.lng).toBeCloseTo(centerLng, 1);
    });
  });
});
