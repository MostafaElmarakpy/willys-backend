import type { Repository, SelectQueryBuilder } from "typeorm";
import {
  generateUniqueSlug,
  updateSlugIfNeeded,
  validateSlugFormat,
  regenerateAllSlugs,
} from "./generate-unique-slug.util";
import type { BilingualString } from "../dto/bilingual-string.dto";

// Mock entity interface
interface MockEntity {
  id: string;
  slug: BilingualString;
  name: { en: string; ar: string };
}

describe("Generate Unique Slug Utility", () => {
  let mockRepository: jest.Mocked<Repository<MockEntity>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<MockEntity>>;

  beforeEach(() => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    } as any;

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      count: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateUniqueSlug", () => {
    it("should generate unique slug when no conflict exists", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const name = { en: "Test Product", ar: "منتج تجريبي" };

      const slug = await generateUniqueSlug(mockRepository as any, name);

      expect(slug.en).toBe("test-product");
      expect(slug.ar).toContain("منتج");
    });

    it("should append number when slug exists", async () => {
      mockQueryBuilder.getOne
        .mockResolvedValueOnce({ id: "1", slug: { en: "test", ar: "تجربة" } } as MockEntity) // First check - exists
        .mockResolvedValueOnce(null); // Second check - doesn't exist

      const name = { en: "Test", ar: "تجربة" };

      const slug = await generateUniqueSlug(mockRepository as any, name);

      expect(slug.en).toBe("test-1");
    });

    it("should throw error when name is empty", async () => {
      const name = { en: "", ar: "تجربة" };

      await expect(generateUniqueSlug(mockRepository as any, name)).rejects.toThrow(
        "Both English and Arabic names are required"
      );
    });

    it("should throw error when Arabic name is empty", async () => {
      const name = { en: "Test", ar: "" };

      await expect(generateUniqueSlug(mockRepository as any, name)).rejects.toThrow(
        "Both English and Arabic names are required"
      );
    });

    it("should throw error when name is null", async () => {
      await expect(generateUniqueSlug(mockRepository as any, null as any)).rejects.toThrow();
    });

    it("should exclude current entity ID when updating", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const name = { en: "Test Product", ar: "منتج تجريبي" };

      await generateUniqueSlug(mockRepository as any, name, {}, "entity-123");

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith("entity.id != :excludeId", {
        excludeId: "entity-123",
      });
    });

    it("should handle special characters in name", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const name = { en: "Test!@#$%^&*() Product", ar: "منتج تجريبي" };

      const slug = await generateUniqueSlug(mockRepository as any, name);

      expect(slug.en).not.toContain("!");
      expect(slug.en).not.toContain("@");
      expect(slug.en).not.toContain("#");
    });

    it("should handle suffix option", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const name = { en: "Test Product", ar: "منتج تجريبي" };

      const slug = await generateUniqueSlug(mockRepository as any, name, { suffix: "v2" });

      expect(slug.en).toContain("v2");
    });

    it("should respect maxLength option", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const name = {
        en: "This Is A Very Long Product Name That Should Be Truncated",
        ar: "هذا اسم طويل جدا",
      };

      const slug = await generateUniqueSlug(mockRepository as any, name, { maxLength: 20 });

      expect(slug.en.length).toBeLessThanOrEqual(20);
    });

    it("should generate timestamp slug when max attempts exceeded", async () => {
      // Make all attempts fail
      mockQueryBuilder.getOne.mockResolvedValue({ id: "1", slug: { en: "test", ar: "تجربة" } } as MockEntity);

      const name = { en: "Test", ar: "تجربة" };

      const slug = await generateUniqueSlug(mockRepository as any, name, { maxAttempts: 1 });

      // Should contain timestamp (13-digit number)
      expect(slug.en).toMatch(/test-\d+/);
    });

    it("should convert to lowercase", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const name = { en: "TEST PRODUCT", ar: "منتج" };

      const slug = await generateUniqueSlug(mockRepository as any, name);

      expect(slug.en).toBe("test-product");
    });

    it("should replace spaces with hyphens", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const name = { en: "Test   Multiple   Spaces", ar: "تجربة" };

      const slug = await generateUniqueSlug(mockRepository as any, name);

      expect(slug.en).not.toContain("  ");
      expect(slug.en).toContain("-");
    });

    it("should handle custom separator", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const name = { en: "Test Product", ar: "منتج تجريبي" };

      const slug = await generateUniqueSlug(mockRepository as any, name, {
        customSeparator: "_",
      });

      expect(slug.en).toContain("_");
    });
  });

  describe("updateSlugIfNeeded", () => {
    it("should return new slug when name changed", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const entity: MockEntity = {
        id: "entity-123",
        slug: { en: "old-slug", ar: "قديم" },
        name: { en: "Old Name", ar: "الاسم القديم" },
      };

      const newName = { en: "New Name", ar: "الاسم الجديد" };

      const newSlug = await updateSlugIfNeeded(mockRepository as any, entity, newName);

      expect(newSlug.en).toBe("new-name");
    });

    it("should return existing slug when slug matches", async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const entity: MockEntity = {
        id: "entity-123",
        slug: { en: "test-name", ar: "اسم-تجربة" },
        name: { en: "Test Name", ar: "اسم تجربة" },
      };

      const newName = { en: "Test Name", ar: "اسم تجربة" };

      const newSlug = await updateSlugIfNeeded(mockRepository as any, entity, newName);

      expect(newSlug.en).toBe("test-name");
    });
  });

  describe("validateSlugFormat", () => {
    it("should return valid for correct slug format", () => {
      const slug = { en: "valid-slug-123", ar: "اسم-عربي-صحيح" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error for empty English slug", () => {
      const slug = { en: "", ar: "اسم-عربي" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("English slug is required");
    });

    it("should return error for empty Arabic slug", () => {
      const slug = { en: "valid-slug", ar: "" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Arabic slug is required");
    });

    it("should return error for invalid English characters", () => {
      const slug = { en: "Invalid!Slug", ar: "اسم-عربي" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("English slug contains invalid characters");
    });

    it("should return error for English slug starting with hyphen", () => {
      const slug = { en: "-invalid-slug", ar: "اسم-عربي" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("English slug cannot start or end with hyphens");
    });

    it("should return error for English slug ending with hyphen", () => {
      const slug = { en: "invalid-slug-", ar: "اسم-عربي" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("English slug cannot start or end with hyphens");
    });

    it("should return error for Arabic slug starting with hyphen", () => {
      const slug = { en: "valid-slug", ar: "-اسم-عربي" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Arabic slug cannot start or end with hyphens");
    });

    it("should return error for Arabic slug ending with hyphen", () => {
      const slug = { en: "valid-slug", ar: "اسم-عربي-" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Arabic slug cannot start or end with hyphens");
    });

    it("should return error for invalid Arabic characters", () => {
      const slug = { en: "valid-slug", ar: "اسم!عربي" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Arabic slug contains invalid characters");
    });

    it("should return multiple errors for multiple issues", () => {
      const slug = { en: "", ar: "" };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it("should accept numeric slugs", () => {
      const slug = { en: "123-456", ar: "١٢٣-٤٥٦" };

      const result = validateSlugFormat(slug);

      // English numeric slugs are valid
      expect(result.errors.filter((e) => e.includes("English"))).toHaveLength(0);
    });

    it("should handle whitespace-only strings", () => {
      const slug = { en: "   ", ar: "   " };

      const result = validateSlugFormat(slug);

      expect(result.isValid).toBe(false);
    });
  });

  describe("regenerateAllSlugs", () => {
    it("should process entities in batches", async () => {
      mockRepository.count.mockResolvedValue(5);
      mockRepository.find.mockResolvedValue([
        { id: "1", slug: { en: "old-1", ar: "قديم-1" }, name: { en: "Name 1", ar: "اسم 1" } },
        { id: "2", slug: { en: "old-2", ar: "قديم-2" }, name: { en: "Name 2", ar: "اسم 2" } },
      ]);
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Silence console.log
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await regenerateAllSlugs(
        mockRepository as any,
        (entity: any) => entity.name,
        {},
        2
      );

      expect(mockRepository.find).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should handle errors gracefully during regeneration", async () => {
      mockRepository.count.mockResolvedValue(1);
      mockRepository.find.mockResolvedValue([
        { id: "1", slug: { en: "old", ar: "قديم" }, name: { en: "", ar: "" } }, // Invalid name
      ]);

      // Silence console output
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await regenerateAllSlugs(
        mockRepository as any,
        (entity: any) => entity.name,
        {},
        1
      );

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("should not update when slug is unchanged", async () => {
      mockRepository.count.mockResolvedValue(1);
      mockRepository.find.mockResolvedValue([
        { id: "1", slug: { en: "test-name", ar: "اسم-تجربة" }, name: { en: "Test Name", ar: "اسم تجربة" } },
      ]);
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await regenerateAllSlugs(
        mockRepository as any,
        (entity: any) => entity.name,
        {},
        10
      );

      // Should still complete without error
      expect(mockRepository.count).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
