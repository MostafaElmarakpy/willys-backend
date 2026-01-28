import { type CallHandler, type ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { TransformInterceptor } from "./transform.interceptor";

describe("TransformInterceptor", () => {
  let interceptor: TransformInterceptor;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  const createMockExecutionContext = (statusCode = 200): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
      }),
    }) as unknown as ExecutionContext;

  const createMockCallHandler = (data: any): CallHandler =>
    ({
      handle: () => of(data),
    }) as CallHandler;

  describe("intercept", () => {
    it("should add statusCode to object response", (done) => {
      const context = createMockExecutionContext(200);
      const callHandler = createMockCallHandler({ message: "Hello" });

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({
          message: "Hello",
          statusCode: 200,
        });
        done();
      });
    });

    it("should wrap primitive data with statusCode", (done) => {
      const context = createMockExecutionContext(200);
      const callHandler = createMockCallHandler("simple string");

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({
          statusCode: 200,
          data: "simple string",
        });
        done();
      });
    });

    it("should wrap null data with statusCode", (done) => {
      const context = createMockExecutionContext(200);
      const callHandler = createMockCallHandler(null);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({
          statusCode: 200,
          data: null,
        });
        done();
      });
    });

    it("should wrap number data with statusCode", (done) => {
      const context = createMockExecutionContext(200);
      const callHandler = createMockCallHandler(42);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({
          statusCode: 200,
          data: 42,
        });
        done();
      });
    });

    it("should add statusCode 201 to created response", (done) => {
      const context = createMockExecutionContext(201);
      const callHandler = createMockCallHandler({ id: "new-id" });

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({
          id: "new-id",
          statusCode: 201,
        });
        done();
      });
    });

    it("should handle array data as object", (done) => {
      const context = createMockExecutionContext(200);
      const callHandler = createMockCallHandler([1, 2, 3]);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({
          0: 1,
          1: 2,
          2: 3,
          statusCode: 200,
        });
        done();
      });
    });

    it("should handle undefined data", (done) => {
      const context = createMockExecutionContext(200);
      const callHandler = createMockCallHandler(undefined);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({
          statusCode: 200,
          data: undefined,
        });
        done();
      });
    });
  });
});
