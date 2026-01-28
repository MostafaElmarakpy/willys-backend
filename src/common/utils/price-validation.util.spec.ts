import { BadRequestException } from "@nestjs/common";
import {
  validatePriceAgainstParent,
  type PriceValidationEntity,
  type PriceValidationOptions,
} from "./price-validation.util";

describe("Price Validation Utility", () => {
  describe("validatePriceAgainstParent", () => {
    const defaultOptions: PriceValidationOptions = {
      itemName: "Item",
      parentName: "Category",
    };

    describe("When parent entity is null", () => {
      it("should skip validation and not throw", () => {
        expect(() => {
          validatePriceAgainstParent(100, null, defaultOptions);
        }).not.toThrow();
      });
    });

    describe("Price is non-positive", () => {
      const parentEntity: PriceValidationEntity = {
        starting_price: 50,
        name: "Test Category",
      };

      it("should throw BadRequestException when price is 0", () => {
        expect(() => {
          validatePriceAgainstParent(0, parentEntity, defaultOptions);
        }).toThrow(BadRequestException);
      });

      it("should throw BadRequestException when price is negative", () => {
        expect(() => {
          validatePriceAgainstParent(-10, parentEntity, defaultOptions);
        }).toThrow(BadRequestException);
      });

      it("should throw BadRequestException when price is null/undefined", () => {
        expect(() => {
          validatePriceAgainstParent(null as any, parentEntity, defaultOptions);
        }).toThrow(BadRequestException);
      });

      it("should include item name in error message", () => {
        try {
          validatePriceAgainstParent(0, parentEntity, defaultOptions);
        } catch (error) {
          expect((error as BadRequestException).message).toContain("Item");
          expect((error as BadRequestException).message).toContain("starting price");
          expect((error as BadRequestException).message).toContain("positive number");
        }
      });

      it("should use custom price field name in error message", () => {
        const options = {
          ...defaultOptions,
          priceFieldName: "base_price",
        };

        try {
          validatePriceAgainstParent(0, parentEntity, options);
        } catch (error) {
          expect((error as BadRequestException).message).toContain("base price");
        }
      });
    });

    describe("Price is less than parent starting price", () => {
      const parentEntity: PriceValidationEntity = {
        starting_price: 100,
        name: "Premium Category",
      };

      it("should throw BadRequestException when item price is less than parent price", () => {
        expect(() => {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        }).toThrow(BadRequestException);
      });

      it("should include parent name in error message", () => {
        try {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].message).toContain("Premium Category");
        }
      });

      it("should include item identifier when provided", () => {
        const options: PriceValidationOptions = {
          ...defaultOptions,
          itemIdentifier: "ITEM-123",
        };

        try {
          validatePriceAgainstParent(50, parentEntity, options);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].message).toContain("ITEM-123");
        }
      });

      it("should include actual prices in error message", () => {
        try {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].message).toContain("50");
          expect(response.errors[0].message).toContain("100");
        }
      });

      it("should return validation error structure", () => {
        try {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.message).toBe("Validation failed");
          expect(response.errors).toBeDefined();
          expect(response.errors[0].key).toBe("starting_price");
        }
      });

      it("should use custom price field name as key", () => {
        const options = {
          ...defaultOptions,
          priceFieldName: "custom_price",
        };

        try {
          validatePriceAgainstParent(50, parentEntity, options);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].key).toBe("custom_price");
        }
      });
    });

    describe("Valid prices", () => {
      const parentEntity: PriceValidationEntity = {
        starting_price: 100,
        name: "Test Category",
      };

      it("should not throw when item price equals parent price", () => {
        expect(() => {
          validatePriceAgainstParent(100, parentEntity, defaultOptions);
        }).not.toThrow();
      });

      it("should not throw when item price exceeds parent price", () => {
        expect(() => {
          validatePriceAgainstParent(150, parentEntity, defaultOptions);
        }).not.toThrow();
      });

      it("should not throw for large valid prices", () => {
        expect(() => {
          validatePriceAgainstParent(1000000, parentEntity, defaultOptions);
        }).not.toThrow();
      });
    });

    describe("Parent entity name handling", () => {
      it("should handle string name", () => {
        const parentEntity: PriceValidationEntity = {
          starting_price: 100,
          name: "Simple Name",
        };

        try {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].message).toContain("Simple Name");
        }
      });

      it("should handle bilingual name with English", () => {
        const parentEntity: PriceValidationEntity = {
          starting_price: 100,
          name: { en: "English Name", ar: "اسم عربي" },
        };

        try {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].message).toContain("English Name");
        }
      });

      it("should handle bilingual name with only Arabic", () => {
        const parentEntity: PriceValidationEntity = {
          starting_price: 100,
          name: { ar: "اسم عربي" },
        };

        try {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].message).toContain("اسم عربي");
        }
      });

      it("should handle empty bilingual name", () => {
        const parentEntity: PriceValidationEntity = {
          starting_price: 100,
          name: {},
        };

        try {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].message).toContain("Unknown");
        }
      });

      it("should handle undefined name", () => {
        const parentEntity: PriceValidationEntity = {
          starting_price: 100,
        };

        try {
          validatePriceAgainstParent(50, parentEntity, defaultOptions);
        } catch (error) {
          const response = (error as BadRequestException).getResponse() as any;
          expect(response.errors[0].message).toContain("Unknown");
        }
      });
    });

    describe("Edge cases", () => {
      it("should handle decimal prices", () => {
        const parentEntity: PriceValidationEntity = {
          starting_price: 99.99,
          name: "Decimal Category",
        };

        expect(() => {
          validatePriceAgainstParent(99.99, parentEntity, defaultOptions);
        }).not.toThrow();

        expect(() => {
          validatePriceAgainstParent(99.98, parentEntity, defaultOptions);
        }).toThrow(BadRequestException);
      });

      it("should handle very small positive prices", () => {
        const parentEntity: PriceValidationEntity = {
          starting_price: 0.01,
          name: "Small Price Category",
        };

        expect(() => {
          validatePriceAgainstParent(0.01, parentEntity, defaultOptions);
        }).not.toThrow();
      });
    });
  });
});
