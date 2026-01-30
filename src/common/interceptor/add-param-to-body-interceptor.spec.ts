import type { CallHandler, ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import {
  AddParamToBodyInterceptor,
  TransformToTypeTypes,
} from "./add-param-to-body-interceptor";

describe("AddParamToBodyInterceptor", () => {
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: { params: Record<string, any>; body: any };

  beforeEach(() => {
    mockRequest = {
      params: { id: "123" },
      body: { existingField: "value" },
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({})),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("intercept", () => {
    it("should add param to body without transformation", () => {
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.id).toBe("123");
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it("should transform param to int when specified", () => {
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
        transformTo: TransformToTypeTypes.int,
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.id).toBe(123);
      expect(typeof mockRequest.body.id).toBe("number");
    });

    it("should transform param to string when specified", () => {
      mockRequest.params.id = 456;
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
        transformTo: TransformToTypeTypes.string,
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.id).toBe("456");
      expect(typeof mockRequest.body.id).toBe("string");
    });

    it("should initialize body as empty object when body is null", () => {
      mockRequest.body = null;
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body).toEqual({ id: "123" });
    });

    it("should initialize body as empty object when body is undefined", () => {
      mockRequest.body = undefined;
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body).toEqual({ id: "123" });
    });

    it("should initialize body as empty object when body is an array", () => {
      mockRequest.body = [1, 2, 3];
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body).toEqual({ id: "123" });
    });

    it("should initialize body as empty object when body is not an object", () => {
      mockRequest.body = "not an object";
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body).toEqual({ id: "123" });
    });

    it("should preserve existing body fields", () => {
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.existingField).toBe("value");
      expect(mockRequest.body.id).toBe("123");
    });

    it("should handle different param names", () => {
      mockRequest.params.branchId = "branch-456";
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "branchId",
      });

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(mockRequest.body.branchId).toBe("branch-456");
    });

    it("should return observable from next handler", (done) => {
      const expectedResult = { success: true };
      (mockCallHandler.handle as jest.Mock).mockReturnValue(of(expectedResult));
      const interceptor = new AddParamToBodyInterceptor({
        paramName: "id",
      });

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe((result) => {
        expect(result).toEqual(expectedResult);
        done();
      });
    });
  });
});
