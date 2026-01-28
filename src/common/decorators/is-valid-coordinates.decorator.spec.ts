import { validate } from "class-validator";
import {
  IsValidCoordinates,
  IsValidPolygon,
  IsValidLineString,
  IsValidStrictCoordinates,
  IsValidFastCoordinates,
  IsValidLargePolygon,
  IsValidRealtimeCoordinates,
} from "./is-valid-coordinates.decorator";

// Test DTOs
class CoordinatesTestDto {
  @IsValidCoordinates()
  coordinates: { lat: number; lng: number }[];
}

class CoordinatesCustomOptionsDto {
  @IsValidCoordinates({
    minPoints: 3,
    maxPoints: 100,
    requireClosure: false,
    validateLatBounds: true,
    validateLngBounds: true,
  })
  coordinates: { lat: number; lng: number }[];
}

class PolygonTestDto {
  @IsValidPolygon()
  coordinates: { lat: number; lng: number }[];
}

class LineStringTestDto {
  @IsValidLineString()
  coordinates: { lat: number; lng: number }[];
}

class StrictCoordinatesTestDto {
  @IsValidStrictCoordinates()
  coordinates: { lat: number; lng: number }[];
}

class FastCoordinatesTestDto {
  @IsValidFastCoordinates()
  coordinates: { lat: number; lng: number }[];
}

class LargePolygonTestDto {
  @IsValidLargePolygon()
  coordinates: { lat: number; lng: number }[];
}

class RealtimeCoordinatesTestDto {
  @IsValidRealtimeCoordinates()
  coordinates: { lat: number; lng: number }[];
}

class DuplicatePointsTestDto {
  @IsValidCoordinates({ checkDuplicatePoints: true })
  coordinates: { lat: number; lng: number }[];
}

class MinAreaTestDto {
  @IsValidCoordinates({ minArea: 0.001 })
  coordinates: { lat: number; lng: number }[];
}

class SelfIntersectionTestDto {
  @IsValidCoordinates({ checkSelfIntersection: true })
  coordinates: { lat: number; lng: number }[];
}

describe("IsValidCoordinates Decorator", () => {
  describe("Basic Validation", () => {
    it("should validate valid closed polygon coordinates", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: 31.0 }, // Closed polygon
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail when coordinates are null", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when coordinates are undefined", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = undefined as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when coordinates array is empty", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail with less than minimum points (default 4)", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.0, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when polygon is not closed", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: 31.5 }, // Not closed
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Latitude Bounds Validation", () => {
    it("should fail when latitude is below -90", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: -91, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: -91, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when latitude is above 90", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 91, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 91, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should accept edge case latitude values (-90, 90)", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: -90, lng: 0 },
        { lat: 90, lng: 0 },
        { lat: 0, lng: 45 },
        { lat: -90, lng: 0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Longitude Bounds Validation", () => {
    it("should fail when longitude is below -180", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: -181 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: -181 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when longitude is above 180", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 181 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: 181 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should accept edge case longitude values (-180, 180)", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 0, lng: -180 },
        { lat: 0, lng: 180 },
        { lat: 45, lng: 0 },
        { lat: 0, lng: -180 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Custom Options", () => {
    it("should allow minimum 3 points when configured", async () => {
      const dto = new CoordinatesCustomOptionsDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should not require closure when disabled", async () => {
      const dto = new CoordinatesCustomOptionsDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.5, lng: 31.5 }, // Not closed - should be valid
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Duplicate Points Validation", () => {
    it("should fail with consecutive duplicate points when check is enabled", async () => {
      const dto = new DuplicatePointsTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.0, lng: 31.0 }, // Duplicate
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Minimum Area Validation", () => {
    it("should fail when polygon area is below minimum", async () => {
      const dto = new MinAreaTestDto();
      // Very small polygon
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.000001, lng: 31.0 },
        { lat: 30.000001, lng: 31.000001 },
        { lat: 30.0, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass when polygon area is above minimum", async () => {
      const dto = new MinAreaTestDto();
      // Larger polygon
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.5, lng: 31.0 },
        { lat: 30.5, lng: 31.5 },
        { lat: 30.0, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Self-Intersection Validation", () => {
    it("should fail for self-intersecting polygon", async () => {
      const dto = new SelfIntersectionTestDto();
      // Figure-8 shape (self-intersecting)
      dto.coordinates = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 0 },
        { lat: 0, lng: 0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass for non-self-intersecting polygon", async () => {
      const dto = new SelfIntersectionTestDto();
      dto.coordinates = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 1, lng: 0 },
        { lat: 0, lng: 0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("IsValidPolygon Decorator", () => {
    it("should validate valid polygon", async () => {
      const dto = new PolygonTestDto();
      dto.coordinates = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 1, lng: 0 },
        { lat: 0, lng: 0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should enforce closure", async () => {
      const dto = new PolygonTestDto();
      dto.coordinates = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 1, lng: 0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("IsValidLineString Decorator", () => {
    it("should validate valid line string with 2 points", async () => {
      const dto = new LineStringTestDto();
      dto.coordinates = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should not require closure", async () => {
      const dto = new LineStringTestDto();
      dto.coordinates = [
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail with less than 2 points", async () => {
      const dto = new LineStringTestDto();
      dto.coordinates = [{ lat: 0, lng: 0 }];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("IsValidStrictCoordinates Decorator", () => {
    it("should validate coordinates with strict bounds", async () => {
      const dto = new StrictCoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("IsValidFastCoordinates Decorator", () => {
    it("should quickly validate simple coordinates", async () => {
      const dto = new FastCoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("IsValidLargePolygon Decorator", () => {
    it("should validate large polygon", async () => {
      const dto = new LargePolygonTestDto();
      // Generate a simple square polygon
      dto.coordinates = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 10 },
        { lat: 10, lng: 10 },
        { lat: 10, lng: 0 },
        { lat: 0, lng: 0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("IsValidRealtimeCoordinates Decorator", () => {
    it("should validate realtime coordinates", async () => {
      const dto = new RealtimeCoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("FormData Format Parsing", () => {
    it("should parse indexed format coordinates", async () => {
      const dto = new CoordinatesTestDto();
      // Simulate FormData indexed format
      (dto as any).coordinates = {
        "0": { lat: "30.0", lng: "31.0" },
        "1": { lat: "30.1", lng: "31.0" },
        "2": { lat: "30.1", lng: "31.1" },
        "3": { lat: "30.0", lng: "31.0" },
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should parse old array format coordinates", async () => {
      const dto = new CoordinatesTestDto();
      (dto as any).coordinates = {
        lat: ["30.0", "30.1", "30.1", "30.0"],
        lng: ["31.0", "31.0", "31.1", "31.0"],
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("NaN Handling", () => {
    it("should fail when latitude is NaN", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: NaN, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: NaN, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when longitude is NaN", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: NaN },
        { lat: 30.1, lng: 31.0 },
        { lat: 30.1, lng: 31.1 },
        { lat: 30.0, lng: NaN },
      ];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Error Messages", () => {
    it("should provide meaningful error message for null coordinates", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = null as any;

      const errors = await validate(dto);
      expect(errors[0].constraints?.isValidCoordinates).toBeDefined();
    });

    it("should provide meaningful error message for insufficient points", async () => {
      const dto = new CoordinatesTestDto();
      dto.coordinates = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.1, lng: 31.0 },
      ];

      const errors = await validate(dto);
      expect(errors[0].constraints?.isValidCoordinates).toContain("at least");
    });
  });
});
