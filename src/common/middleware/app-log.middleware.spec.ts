import type { NextFunction, Request, Response } from "express";
import { AppLoggerMiddleware } from "./app-log.middleware";

describe("AppLoggerMiddleware", () => {
  let middleware: AppLoggerMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    middleware = new AppLoggerMiddleware();
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
    logSpy = jest.spyOn((middleware as any).logger, "log").mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
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

      expect(logSpy).toHaveBeenCalled();
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

      expect(logSpy).not.toHaveBeenCalled();
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

    it("should include IP address in log", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("127.0.0.1"));

      process.env.NODE_ENV = originalEnv;
    });

    it("should include HTTP method in log", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("GET"));

      process.env.NODE_ENV = originalEnv;
    });

    it("should include URL in log", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("/api/test"));

      process.env.NODE_ENV = originalEnv;
    });

    it("should include status code in log", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("200"));

      process.env.NODE_ENV = originalEnv;
    });

    it("should include params in log", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id":"123"'),
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should include query in log", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('"page":"1"'),
      );

      process.env.NODE_ENV = originalEnv;
    });
  });
});
