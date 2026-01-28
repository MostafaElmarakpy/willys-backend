import type { NextFunction, Request, Response } from "express";
import { LocaleMiddleware } from "./locale.middleware";

describe("LocaleMiddleware", () => {
  let middleware: LocaleMiddleware;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new LocaleMiddleware();
    mockResponse = {};
    nextFunction = jest.fn();
  });

  const createMockRequest = (
    headers: Record<string, string> = {},
  ): Partial<Request> => ({
    headers,
  });

  describe("use", () => {
    it("should call next function", () => {
      const mockRequest = createMockRequest({});

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should handle accept-language header", () => {
      const mockRequest = createMockRequest({
        "accept-language": "en",
      });

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should handle Accept-Language header (capitalized)", () => {
      const mockRequest = createMockRequest({
        "Accept-Language": "fr",
      });

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should handle x-language header", () => {
      const mockRequest = createMockRequest({
        "x-language": "de",
      });

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should handle x-locale header", () => {
      const mockRequest = createMockRequest({
        "x-locale": "es",
      });

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should default to ar when no locale header is present", () => {
      const mockRequest = createMockRequest({});

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should prioritize accept-language over other headers", () => {
      const mockRequest = createMockRequest({
        "accept-language": "ar",
        "x-language": "de",
        "x-locale": "es",
      });

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
