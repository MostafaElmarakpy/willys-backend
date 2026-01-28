import { HttpException, HttpStatus } from "@nestjs/common";
import {
  createCreatedResponse,
  createErrorResponse,
  createPaginatedResponse,
  createSuccessResponse,
  throwBadRequest,
  throwConflict,
  throwForbidden,
  throwInternalError,
  throwNotFound,
  throwUnauthorized,
  throwValidationError,
} from "./api-response-wrapper";

describe("API Response Wrapper", () => {
  describe("createSuccessResponse", () => {
    it("should create success response with default values", () => {
      const data = { id: 1, name: "Test" };

      const response = createSuccessResponse(data);

      expect(response).toEqual({
        statusCode: HttpStatus.OK,
        message: "Operation successful",
        data,
      });
    });

    it("should create success response with custom message", () => {
      const data = { id: 1 };
      const message = "User fetched successfully";

      const response = createSuccessResponse(data, message);

      expect(response.message).toBe(message);
      expect(response.statusCode).toBe(HttpStatus.OK);
    });

    it("should create success response with custom status code", () => {
      const data = { id: 1 };

      const response = createSuccessResponse(
        data,
        "Accepted",
        HttpStatus.ACCEPTED,
      );

      expect(response.statusCode).toBe(HttpStatus.ACCEPTED);
    });

    it("should handle null data", () => {
      const response = createSuccessResponse(null);

      expect(response.data).toBeNull();
      expect(response.statusCode).toBe(HttpStatus.OK);
    });

    it("should handle array data", () => {
      const data = [{ id: 1 }, { id: 2 }];

      const response = createSuccessResponse(data);

      expect(response.data).toEqual(data);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("should handle primitive data types", () => {
      const stringResponse = createSuccessResponse("test");
      const numberResponse = createSuccessResponse(42);
      const booleanResponse = createSuccessResponse(true);

      expect(stringResponse.data).toBe("test");
      expect(numberResponse.data).toBe(42);
      expect(booleanResponse.data).toBe(true);
    });
  });

  describe("createCreatedResponse", () => {
    it("should create response with CREATED status", () => {
      const data = { id: 1, name: "New Resource" };

      const response = createCreatedResponse(data);

      expect(response.statusCode).toBe(HttpStatus.CREATED);
      expect(response.message).toBe("Resource created successfully");
      expect(response.data).toEqual(data);
    });

    it("should create response with custom message", () => {
      const data = { id: 1 };

      const response = createCreatedResponse(
        data,
        "User registered successfully",
      );

      expect(response.message).toBe("User registered successfully");
      expect(response.statusCode).toBe(HttpStatus.CREATED);
    });
  });

  describe("createPaginatedResponse", () => {
    it("should create paginated response with correct pagination info", () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const page = 1;
      const limit = 10;
      const total = 25;

      const response = createPaginatedResponse(data, page, limit, total);

      expect(response.statusCode).toBe(HttpStatus.OK);
      expect(response.message).toBe("Data retrieved successfully");
      expect(response.data).toEqual(data);
      expect(response.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3, // Math.ceil(25/10)
      });
    });

    it("should calculate totalPages correctly for exact division", () => {
      const data = [{ id: 1 }];

      const response = createPaginatedResponse(data, 1, 10, 30);

      expect(response.pagination.totalPages).toBe(3);
    });

    it("should calculate totalPages correctly for non-exact division", () => {
      const data = [{ id: 1 }];

      const response = createPaginatedResponse(data, 1, 10, 31);

      expect(response.pagination.totalPages).toBe(4);
    });

    it("should handle empty data", () => {
      const response = createPaginatedResponse([], 1, 10, 0);

      expect(response.data).toEqual([]);
      expect(response.pagination.total).toBe(0);
      expect(response.pagination.totalPages).toBe(0);
    });

    it("should handle custom message", () => {
      const data = [{ id: 1 }];

      const response = createPaginatedResponse(
        data,
        1,
        10,
        1,
        "Users retrieved",
      );

      expect(response.message).toBe("Users retrieved");
    });

    it("should handle single item total", () => {
      const data = [{ id: 1 }];

      const response = createPaginatedResponse(data, 1, 10, 1);

      expect(response.pagination.totalPages).toBe(1);
    });
  });

  describe("createErrorResponse", () => {
    it("should throw HttpException with default status code", () => {
      expect(() => createErrorResponse("Something went wrong")).toThrow(
        HttpException,
      );
    });

    it("should throw HttpException with correct status code", () => {
      try {
        createErrorResponse("Not found", HttpStatus.NOT_FOUND);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it("should include error type when provided", () => {
      try {
        createErrorResponse(
          "Invalid input",
          HttpStatus.BAD_REQUEST,
          "Bad Request",
        );
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.error).toBe("Bad Request");
      }
    });

    it("should handle array of messages", () => {
      try {
        createErrorResponse(["Error 1", "Error 2"], HttpStatus.BAD_REQUEST);
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toEqual(["Error 1", "Error 2"]);
      }
    });

    it("should not include error key when not provided", () => {
      try {
        createErrorResponse("Error message", HttpStatus.BAD_REQUEST);
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.error).toBeUndefined();
      }
    });
  });

  describe("throwBadRequest", () => {
    it("should throw BAD_REQUEST with default message", () => {
      try {
        throwBadRequest();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.BAD_REQUEST,
        );
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Bad Request");
      }
    });

    it("should throw BAD_REQUEST with custom message", () => {
      try {
        throwBadRequest("Invalid email format");
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Invalid email format");
      }
    });
  });

  describe("throwUnauthorized", () => {
    it("should throw UNAUTHORIZED with default message", () => {
      try {
        throwUnauthorized();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.UNAUTHORIZED,
        );
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Unauthorized");
      }
    });

    it("should throw UNAUTHORIZED with custom message", () => {
      try {
        throwUnauthorized("Invalid token");
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Invalid token");
      }
    });
  });

  describe("throwForbidden", () => {
    it("should throw FORBIDDEN with default message", () => {
      try {
        throwForbidden();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Forbidden");
      }
    });

    it("should throw FORBIDDEN with custom message", () => {
      try {
        throwForbidden("Access denied");
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Access denied");
      }
    });
  });

  describe("throwNotFound", () => {
    it("should throw NOT_FOUND with default message", () => {
      try {
        throwNotFound();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Resource not found");
      }
    });

    it("should throw NOT_FOUND with custom message", () => {
      try {
        throwNotFound("User not found");
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("User not found");
      }
    });
  });

  describe("throwConflict", () => {
    it("should throw CONFLICT with default message", () => {
      try {
        throwConflict();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Conflict");
      }
    });

    it("should throw CONFLICT with custom message", () => {
      try {
        throwConflict("Email already exists");
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Email already exists");
      }
    });
  });

  describe("throwValidationError", () => {
    it("should throw BAD_REQUEST with default message", () => {
      try {
        throwValidationError();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.BAD_REQUEST,
        );
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Validation failed");
        expect(response.error).toBe("Validation Error");
      }
    });

    it("should throw BAD_REQUEST with custom message", () => {
      try {
        throwValidationError("Email is required");
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Email is required");
      }
    });

    it("should throw BAD_REQUEST with array of messages", () => {
      try {
        throwValidationError(["Email is required", "Password is too short"]);
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toEqual([
          "Email is required",
          "Password is too short",
        ]);
      }
    });
  });

  describe("throwInternalError", () => {
    it("should throw INTERNAL_SERVER_ERROR with default message", () => {
      try {
        throwInternalError();
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Internal server error");
      }
    });

    it("should throw INTERNAL_SERVER_ERROR with custom message", () => {
      try {
        throwInternalError("Database connection failed");
      } catch (error) {
        const response = (error as HttpException).getResponse() as any;
        expect(response.message).toBe("Database connection failed");
      }
    });
  });
});
