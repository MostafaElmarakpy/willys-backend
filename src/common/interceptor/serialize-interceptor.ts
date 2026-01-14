import {
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
  UseInterceptors,
} from "@nestjs/common";
import { type ClassConstructor, plainToInstance } from "class-transformer";
import { map, type Observable } from "rxjs";

export function Serialize<T>(dto: ClassConstructor<T>) {
  return UseInterceptors(new SerializeInterceptor(dto));
}

export class SerializeInterceptor<T> implements NestInterceptor {
  constructor(private dto: ClassConstructor<T>) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<T | T[]> {
    return next.handle().pipe(
      map((data) => {
        return plainToInstance(this.dto, data, {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
          exposeDefaultValues: true,
        });
      }),
    );
  }
}
