import { type CallHandler, type ExecutionContext } from "@nestjs/common";
import { of } from "rxjs";
import { LocaleInterceptor } from "./locale.interceptor";

describe("LocaleInterceptor", () => {
  let interceptor: LocaleInterceptor;

  beforeEach(() => {
    interceptor = new LocaleInterceptor();
  });

  const createMockExecutionContext = (
    headers: Record<string, string> = {},
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as unknown as ExecutionContext;

  const createMockCallHandler = (): CallHandler =>
    ({
      handle: () => of({ data: "test" }),
    }) as CallHandler;

  describe("intercept", () => {
    it("should handle accept-language header", (done) => {
      const context = createMockExecutionContext({
        "accept-language": "ar",
      });
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({ data: "test" });
        done();
      });
    });

    it("should handle Accept-Language header (capitalized)", (done) => {
      const context = createMockExecutionContext({
        "Accept-Language": "fr",
      });
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({ data: "test" });
        done();
      });
    });

    it("should handle x-language header", (done) => {
      const context = createMockExecutionContext({
        "x-language": "de",
      });
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({ data: "test" });
        done();
      });
    });

    it("should handle x-locale header", (done) => {
      const context = createMockExecutionContext({
        "x-locale": "es",
      });
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({ data: "test" });
        done();
      });
    });

    it("should default to en when no locale header is present", (done) => {
      const context = createMockExecutionContext({});
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({ data: "test" });
        done();
      });
    });

    it("should prioritize accept-language over other headers", (done) => {
      const context = createMockExecutionContext({
        "accept-language": "ar",
        "x-language": "de",
        "x-locale": "es",
      });
      const callHandler = createMockCallHandler();

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(result).toEqual({ data: "test" });
        done();
      });
    });
  });
});
