import { HttpException, HttpStatus } from "@nestjs/common";
import type { NextFunction, Response } from "express";
import { AuthMiddleware, MISSING_AUTH_HEADER } from "./auth.middleware";

describe("AuthMiddleware", () => {
  let middleware: AuthMiddleware;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new AuthMiddleware();
    mockResponse = {};
    nextFunction = jest.fn();
  });

  describe("use", () => {
    it("should call next when authorization header is present", async () => {
      const mockRequest = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      await middleware.use(mockRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should throw HttpException when authorization header is missing", async () => {
      const mockRequest = {
        headers: {},
      };

      await expect(
        middleware.use(mockRequest, mockResponse as Response, nextFunction),
      ).rejects.toThrow(HttpException);
    });

    it("should throw BAD_REQUEST status when authorization header is missing", async () => {
      const mockRequest = {
        headers: {},
      };

      try {
        await middleware.use(
          mockRequest,
          mockResponse as Response,
          nextFunction,
        );
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.BAD_REQUEST,
        );
      }
    });

    it("should include correct error message when authorization header is missing", async () => {
      const mockRequest = {
        headers: {},
      };

      try {
        await middleware.use(
          mockRequest,
          mockResponse as Response,
          nextFunction,
        );
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toEqual({
          message: MISSING_AUTH_HEADER,
        });
      }
    });

    it("should not call next when authorization header is missing", async () => {
      const mockRequest = {
        headers: {},
      };

      try {
        await middleware.use(
          mockRequest,
          mockResponse as Response,
          nextFunction,
        );
      } catch (_error) {
        // Expected to throw
      }

      expect(nextFunction).not.toHaveBeenCalled();
    });

    it("should accept any authorization value", async () => {
      const mockRequest = {
        headers: {
          authorization: "any-value",
        },
      };

      await middleware.use(mockRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
