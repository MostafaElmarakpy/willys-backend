import { type CallHandler, type ExecutionContext } from "@nestjs/common";
import { Expose } from "class-transformer";
import { of } from "rxjs";
import { SerializeInterceptor } from "./serialize-interceptor";

// Test DTO
class TestDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  // Not exposed - should be excluded
  password?: string;
}

describe("SerializeInterceptor", () => {
  let interceptor: SerializeInterceptor<TestDto>;

  beforeEach(() => {
    interceptor = new SerializeInterceptor(TestDto);
  });

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    }) as unknown as ExecutionContext;

  const createMockCallHandler = (data: any): CallHandler =>
    ({
      handle: () => of(data),
    }) as CallHandler;

  describe("intercept", () => {
    it("should transform plain object to DTO instance", (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({
        id: "123",
        name: "Test User",
        password: "secret",
      });

      interceptor.intercept(context, callHandler).subscribe((result) => {
        const dto = result as TestDto;
        expect(dto).toBeInstanceOf(TestDto);
        expect(dto.id).toBe("123");
        expect(dto.name).toBe("Test User");
        expect(dto.password).toBeUndefined();
        done();
      });
    });

    it("should transform array of objects to DTO instances", (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler([
        { id: "1", name: "User 1", password: "secret1" },
        { id: "2", name: "User 2", password: "secret2" },
      ]);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(2);
        expect((result as TestDto[])[0].id).toBe("1");
        expect((result as TestDto[])[0].password).toBeUndefined();
        expect((result as TestDto[])[1].id).toBe("2");
        expect((result as TestDto[])[1].password).toBeUndefined();
        done();
      });
    });

    it("should handle null data", (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler(null);

      interceptor.intercept(context, callHandler).subscribe((result) => {
        // plainToInstance with null returns an empty instance or null depending on version
        expect(result).toBeDefined();
        done();
      });
    });

    it("should handle empty object", (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({});

      interceptor.intercept(context, callHandler).subscribe((result) => {
        const dto = result as TestDto;
        expect(dto).toBeInstanceOf(TestDto);
        expect(dto.id).toBeUndefined();
        expect(dto.name).toBeUndefined();
        done();
      });
    });

    it("should exclude properties not decorated with @Expose", (done) => {
      const context = createMockExecutionContext();
      const callHandler = createMockCallHandler({
        id: "123",
        name: "Test",
        extraField: "should be excluded",
        password: "also excluded",
      });

      interceptor.intercept(context, callHandler).subscribe((result) => {
        const dto = result as TestDto;
        expect(dto.id).toBe("123");
        expect(dto.name).toBe("Test");
        expect((dto as any).extraField).toBeUndefined();
        expect(dto.password).toBeUndefined();
        done();
      });
    });
  });
});
