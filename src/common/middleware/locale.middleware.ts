// locale.middleware.ts

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const locale =
      req.headers['accept-language'] ??
      req.headers['Accept-Language'] ??
      req.headers['x-language'] ??
      req.headers['x-locale'] ??
      'ar'; // Default to 'ar'

    next();
  }
}
