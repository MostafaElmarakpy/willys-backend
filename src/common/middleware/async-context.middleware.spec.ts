import type { NextFunction, Request, Response } from "express";
import { ClsMiddleware } from "./async-context.middleware";
import { ClsService } from "nestjs-cls";
import { UsersService } from "src/modules/users/users.service";
import { CURRENT_USER } from "../constants/context";

describe("ClsMiddleware", () => {
  let middleware: ClsMiddleware;
  let mockClsService: jest.Mocked<ClsService>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    fullName: "Test User",
  };

  beforeEach(() => {
    mockClsService = {
      run: jest.fn((callback) => callback()),
      set: jest.fn(),
    } as unknown as jest.Mocked<ClsService>;

    mockUsersService = {
      validateUserToken: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    middleware = new ClsMiddleware(mockClsService, mockUsersService);

    mockRequest = {
      headers: {},
      user: undefined,
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("use", () => {
    it("should call next function", async () => {
      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it("should run within CLS context", async () => {
      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockClsService.run).toHaveBeenCalled();
    });

    it("should set user to null when no authorization header", async () => {
      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockClsService.set).toHaveBeenCalledWith(CURRENT_USER, null);
      expect(mockRequest.user).toBeNull();
    });

    it("should extract and validate Bearer token", async () => {
      mockRequest.headers = { authorization: "Bearer valid-token" };
      mockUsersService.validateUserToken.mockResolvedValue(mockUser as any);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockUsersService.validateUserToken).toHaveBeenCalledWith(
        "valid-token",
      );
    });

    it("should set user in CLS context when token is valid", async () => {
      mockRequest.headers = { authorization: "Bearer valid-token" };
      mockUsersService.validateUserToken.mockResolvedValue(mockUser as any);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockClsService.set).toHaveBeenCalledWith(CURRENT_USER, mockUser);
      expect(mockRequest.user).toEqual(mockUser);
    });

    it("should handle invalid token gracefully", async () => {
      mockRequest.headers = { authorization: "Bearer invalid-token" };
      mockUsersService.validateUserToken.mockRejectedValue(new Error("Invalid"));

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockClsService.set).toHaveBeenCalledWith(CURRENT_USER, null);
      expect(mockRequest.user).toBeNull();
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should not validate token when authorization type is not Bearer", async () => {
      mockRequest.headers = { authorization: "Basic credentials" };

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockUsersService.validateUserToken).not.toHaveBeenCalled();
      expect(mockClsService.set).toHaveBeenCalledWith(CURRENT_USER, null);
    });

    it("should handle empty authorization header", async () => {
      mockRequest.headers = { authorization: "" };

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockUsersService.validateUserToken).not.toHaveBeenCalled();
    });

    it("should handle malformed authorization header", async () => {
      mockRequest.headers = { authorization: "Bearer" };

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockUsersService.validateUserToken).not.toHaveBeenCalled();
    });
  });
});
