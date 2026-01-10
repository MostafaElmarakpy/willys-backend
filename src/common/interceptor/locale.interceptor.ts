import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LocaleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const _locale =
      request.headers['accept-language'] ??
      request.headers['Accept-Language'] ??
      request.headers['x-language'] ??
      request.headers['x-locale'] ??
      'en';

    return next.handle();
  }
}
