import { validate } from "class-validator";
import { IsValidPolygon } from "./is-valid-polygon.decorator";

// Test DTO
class GeoJsonPolygonTestDto {
  @IsValidPolygon()
  polygon: any;
}

describe("IsValidPolygon Decorator (GeoJSON)", () => {
  describe("Valid GeoJSON Polygons", () => {
    it("should validate a valid simple GeoJSON polygon", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [31.0, 30.0],
            [31.0, 30.1],
            [31.1, 30.1],
            [31.1, 30.0],
            [31.0, 30.0], // Closed ring
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate polygon with multiple rings (exterior and holes)", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          // Exterior ring
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          // Hole
          [
            [2, 2],
            [8, 2],
            [8, 8],
            [2, 8],
            [2, 2],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate polygon at geographic boundaries", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
            [-180, -90],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Invalid Type", () => {
    it("should fail when polygon is null", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = null;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when polygon is undefined", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when polygon is not an object", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = "not an object";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when type is not Polygon", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Point",
        coordinates: [31.0, 30.0],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when type is missing", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        coordinates: [
          [
            [31.0, 30.0],
            [31.0, 30.1],
            [31.1, 30.1],
            [31.0, 30.0],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Invalid Coordinates Structure", () => {
    it("should fail when coordinates is not an array", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: "not an array",
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when coordinates is empty array", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when ring is not an array", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: ["not an array"],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when ring has less than 4 points", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [31.0, 30.0],
            [31.0, 30.1],
            [31.0, 30.0], // Only 3 points
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Invalid Coordinate Pairs", () => {
    it("should fail when coordinate pair is not an array", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            { lng: 31.0, lat: 30.0 }, // Object instead of array
            [31.0, 30.1],
            [31.1, 30.1],
            { lng: 31.0, lat: 30.0 },
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when coordinate pair has wrong length", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [31.0, 30.0, 100], // 3 values instead of 2
            [31.0, 30.1],
            [31.1, 30.1],
            [31.0, 30.0, 100],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when coordinates are not numbers", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            ["31.0", "30.0"], // Strings instead of numbers
            [31.0, 30.1],
            [31.1, 30.1],
            ["31.0", "30.0"],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Coordinate Range Validation", () => {
    it("should fail when longitude is below -180", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [-181, 30.0],
            [31.0, 30.1],
            [31.1, 30.1],
            [-181, 30.0],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when longitude is above 180", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [181, 30.0],
            [31.0, 30.1],
            [31.1, 30.1],
            [181, 30.0],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when latitude is below -90", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [31.0, -91],
            [31.0, 30.1],
            [31.1, 30.1],
            [31.0, -91],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when latitude is above 90", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [31.0, 91],
            [31.0, 30.1],
            [31.1, 30.1],
            [31.0, 91],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Ring Closure Validation", () => {
    it("should fail when ring is not closed", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          [
            [31.0, 30.0],
            [31.0, 30.1],
            [31.1, 30.1],
            [31.1, 30.0], // Not same as first point
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when any ring in polygon with holes is not closed", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = {
        type: "Polygon",
        coordinates: [
          // Exterior ring - closed
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          // Hole - NOT closed
          [
            [2, 2],
            [8, 2],
            [8, 8],
            [2, 8],
          ],
        ],
      };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Error Message", () => {
    it("should provide meaningful error message", async () => {
      const dto = new GeoJsonPolygonTestDto();
      dto.polygon = null;

      const errors = await validate(dto);
      expect(errors[0].constraints?.isValidPolygon).toContain("GeoJSON Polygon");
    });
  });
});
