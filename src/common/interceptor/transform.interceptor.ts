import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => {
        if (typeof data === 'object' && data !== null) {
          return { ...data, statusCode: response.statusCode };
        } else {
          return {
            statusCode: response.statusCode,
            data,
          };
        }
      }),
    );
  }
}
