import { validate } from "class-validator";
import { IsPhoneNumberWithCountryCode } from "./is-phone-number-with-Country-code";
import { AtLeastOneValue } from "./at-least-one-price";
import { IsUniqueConstraint } from "./is-unique.constraint";
import { DataSource, Not, Repository } from "typeorm";

// Test DTOs for validators
class PhoneNumberTestDto {
  @IsPhoneNumberWithCountryCode("countryCode")
  phoneNumber: string;

  countryCode: string;
}

class AtLeastOneValueTestDto {
  @AtLeastOneValue(["monthlyPrice", "yearlyPrice", "halfYearPrice"])
  monthlyPrice?: number;

  yearlyPrice?: number;
  halfYearPrice?: number;
}

describe("Validators", () => {
  describe("IsPhoneNumberWithCountryCode", () => {
    it("should validate valid Egyptian phone number", async () => {
      const dto = new PhoneNumberTestDto();
      dto.phoneNumber = "01012345678";
      dto.countryCode = "EG";

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate valid US phone number", async () => {
      const dto = new PhoneNumberTestDto();
      dto.phoneNumber = "2025551234";
      dto.countryCode = "US";

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should validate valid UK phone number", async () => {
      const dto = new PhoneNumberTestDto();
      dto.phoneNumber = "7911123456";
      dto.countryCode = "GB";

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail for invalid phone number format", async () => {
      const dto = new PhoneNumberTestDto();
      dto.phoneNumber = "invalid";
      dto.countryCode = "EG";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("IsPhoneNumberWithCountryCode");
    });

    it("should fail when country code is not provided", async () => {
      const dto = new PhoneNumberTestDto();
      dto.phoneNumber = "01012345678";
      dto.countryCode = "";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when country code is null", async () => {
      const dto = new PhoneNumberTestDto();
      dto.phoneNumber = "01012345678";
      dto.countryCode = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail for phone number that doesn't match country code", async () => {
      const dto = new PhoneNumberTestDto();
      dto.phoneNumber = "01012345678"; // Egyptian format
      dto.countryCode = "US"; // US country code

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should provide meaningful error message", async () => {
      const dto = new PhoneNumberTestDto();
      dto.phoneNumber = "invalid";
      dto.countryCode = "EG";

      const errors = await validate(dto);
      expect(errors[0].constraints?.IsPhoneNumberWithCountryCode).toContain("phoneNumber");
      expect(errors[0].constraints?.IsPhoneNumberWithCountryCode).toContain("EG");
    });
  });

  describe("AtLeastOneValue", () => {
    it("should pass when at least one value is provided", async () => {
      const dto = new AtLeastOneValueTestDto();
      dto.monthlyPrice = 100;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass when multiple values are provided", async () => {
      const dto = new AtLeastOneValueTestDto();
      dto.monthlyPrice = 100;
      dto.yearlyPrice = 1000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass when only yearlyPrice is provided", async () => {
      const dto = new AtLeastOneValueTestDto();
      dto.yearlyPrice = 1000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should pass when only halfYearPrice is provided", async () => {
      const dto = new AtLeastOneValueTestDto();
      dto.halfYearPrice = 500;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should fail when no values are provided", async () => {
      const dto = new AtLeastOneValueTestDto();

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("atLeastOneValue");
    });

    it("should fail when all values are undefined", async () => {
      const dto = new AtLeastOneValueTestDto();
      dto.monthlyPrice = undefined;
      dto.yearlyPrice = undefined;
      dto.halfYearPrice = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should fail when all values are null", async () => {
      const dto = new AtLeastOneValueTestDto();
      dto.monthlyPrice = null as any;
      dto.yearlyPrice = null as any;
      dto.halfYearPrice = null as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should pass with zero value (0 is a valid value)", async () => {
      const dto = new AtLeastOneValueTestDto();
      dto.monthlyPrice = 0;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it("should provide meaningful error message", async () => {
      const dto = new AtLeastOneValueTestDto();

      const errors = await validate(dto);
      expect(errors[0].constraints?.atLeastOneValue).toContain("At least one");
    });
  });

  describe("IsUniqueConstraint", () => {
    let constraint: IsUniqueConstraint;
    let mockRepository: jest.Mocked<Repository<any>>;
    let mockDataSource: jest.Mocked<DataSource>;

    beforeEach(() => {
      mockRepository = {
        count: jest.fn(),
      } as any;

      mockDataSource = {
        getRepository: jest.fn().mockReturnValue(mockRepository),
      } as any;

      constraint = new IsUniqueConstraint(mockDataSource);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should return true when value is unique", async () => {
      mockRepository.count.mockResolvedValue(0);

      const args = {
        constraints: [class TestEntity {}, "email"],
        object: { email: "test@example.com" },
      } as any;

      const result = await constraint.validate("test@example.com", args);

      expect(result).toBe(true);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should return false when value is not unique", async () => {
      mockRepository.count.mockResolvedValue(1);

      const args = {
        constraints: [class TestEntity {}, "email"],
        object: { email: "test@example.com" },
      } as any;

      const result = await constraint.validate("test@example.com", args);

      expect(result).toBe(false);
    });

    it("should exclude current entity when updating (id is present)", async () => {
      mockRepository.count.mockResolvedValue(0);

      const args = {
        constraints: [class TestEntity {}, "email"],
        object: { id: "entity-123", email: "test@example.com" },
      } as any;

      const result = await constraint.validate("test@example.com", args);

      expect(result).toBe(true);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          email: "test@example.com",
          id: Not("entity-123"),
        },
      });
    });

    it("should return false when repository throws error", async () => {
      mockRepository.count.mockRejectedValue(new Error("Database error"));

      const args = {
        constraints: [class TestEntity {}, "email"],
        object: { email: "test@example.com" },
      } as any;

      const result = await constraint.validate("test@example.com", args);

      expect(result).toBe(false);
    });

    it("should provide meaningful error message", () => {
      const args = {
        constraints: [class TestEntity {}, "email"],
        object: { email: "test@example.com" },
      } as any;

      const message = constraint.defaultMessage(args);

      expect(message).toBe("email must be unique");
    });

    it("should handle null value", async () => {
      mockRepository.count.mockResolvedValue(0);

      const args = {
        constraints: [class TestEntity {}, "email"],
        object: { email: null },
      } as any;

      const result = await constraint.validate(null, args);

      expect(result).toBe(true);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { email: null },
      });
    });

    it("should handle undefined id in object", async () => {
      mockRepository.count.mockResolvedValue(0);

      const args = {
        constraints: [class TestEntity {}, "email"],
        object: { email: "test@example.com", id: undefined },
      } as any;

      const result = await constraint.validate("test@example.com", args);

      expect(result).toBe(true);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("should use getRepository with correct entity class", async () => {
      class UserEntity {}
      mockRepository.count.mockResolvedValue(0);

      const args = {
        constraints: [UserEntity, "email"],
        object: { email: "test@example.com" },
      } as any;

      await constraint.validate("test@example.com", args);

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(UserEntity);
    });
  });
});
