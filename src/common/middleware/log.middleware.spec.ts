import type { NextFunction, Request, Response } from "express";
import { LoggerMiddleware } from "./log.middleware";

describe("LoggerMiddleware", () => {
  let middleware: LoggerMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    mockRequest = {
      ip: "127.0.0.1",
      method: "GET",
      url: "/api/test",
      params: { id: "123" },
      query: { page: "1" },
      body: { data: "test" },
    };
    mockResponse = {
      statusCode: 200,
    };
    nextFunction = jest.fn();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("use", () => {
    it("should log request details in non-production environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(consoleSpy).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it("should not log in production environment", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it("should always call next function", () => {
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should include request details in log", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("127.0.0.1"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("GET"),
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/test"),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});
