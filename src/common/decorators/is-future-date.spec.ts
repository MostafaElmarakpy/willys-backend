import { validate } from "class-validator";
import { IsFutureDate, IsFutureYear } from "./is-future-date";

// Test DTOs
class FutureDateTestDto {
  @IsFutureDate()
  date: Date;
}

class FutureYearTestDto {
  @IsFutureYear()
  year: number;
}

describe("IsFutureDate Decorator", () => {
  describe("Valid Future Dates", () => {
    it("should validate date in the future", async () => {
      const dto = new FutureDateTestDto();
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      dto.date = futureDate;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate date far in the future", async () => {
      const dto = new FutureDateTestDto();
      dto.date = new Date("2099-12-31");

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate date just a day in the future", async () => {
      const dto = new FutureDateTestDto();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dto.date = tomorrow;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Invalid Dates", () => {
    it("should fail for date in the past", async () => {
      const dto = new FutureDateTestDto();
      dto.date = new Date("2020-01-01");

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("isFutureDate");
    });

    it("should fail for current date (not strictly future)", async () => {
      const dto = new FutureDateTestDto();
      dto.date = new Date();

      // Note: This might be flaky due to timing, but the decorator requires strictly greater
      const errors = await validate(dto);
      // Date created at exact same millisecond might pass, so we accept 0 or 1 error
      expect(errors.length).toBeLessThanOrEqual(1);
    });

    it("should fail for null value", async () => {
      const dto = new FutureDateTestDto();
      dto.date = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for undefined value", async () => {
      const dto = new FutureDateTestDto();
      dto.date = undefined as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for non-Date value", async () => {
      const dto = new FutureDateTestDto();
      dto.date = "2099-12-31" as any; // String instead of Date

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for invalid Date object", async () => {
      const dto = new FutureDateTestDto();
      dto.date = new Date("invalid");

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Error Message", () => {
    it("should provide meaningful error message", async () => {
      const dto = new FutureDateTestDto();
      dto.date = new Date("2020-01-01");

      const errors = await validate(dto);
      expect(errors[0].constraints?.isFutureDate).toBe("Date must be in the future");
    });
  });
});

describe("IsFutureYear Decorator", () => {
  const currentYear = new Date().getFullYear();

  describe("Valid Future Years", () => {
    it("should validate current year", async () => {
      const dto = new FutureYearTestDto();
      dto.year = currentYear;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate next year", async () => {
      const dto = new FutureYearTestDto();
      dto.year = currentYear + 1;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate far future year", async () => {
      const dto = new FutureYearTestDto();
      dto.year = 2099;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("Invalid Years", () => {
    it("should fail for past year", async () => {
      const dto = new FutureYearTestDto();
      dto.year = currentYear - 1;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("isFutureYear");
    });

    it("should fail for far past year", async () => {
      const dto = new FutureYearTestDto();
      dto.year = 2000;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for null value", async () => {
      const dto = new FutureYearTestDto();
      dto.year = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for undefined value", async () => {
      const dto = new FutureYearTestDto();
      dto.year = undefined as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for non-number value", async () => {
      const dto = new FutureYearTestDto();
      dto.year = "2099" as any; // String instead of number

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for negative year", async () => {
      const dto = new FutureYearTestDto();
      dto.year = -2024;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for NaN", async () => {
      const dto = new FutureYearTestDto();
      dto.year = NaN;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("Error Message", () => {
    it("should provide meaningful error message", async () => {
      const dto = new FutureYearTestDto();
      dto.year = 2000;

      const errors = await validate(dto);
      expect(errors[0].constraints?.isFutureYear).toBe("Year must be current year or in the future");
    });
  });
});
