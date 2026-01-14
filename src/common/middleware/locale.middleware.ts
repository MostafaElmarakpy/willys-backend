// locale.middleware.ts

import { Injectable, type NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const _locale =
      req.headers["accept-language"] ??
      req.headers["Accept-Language"] ??
      req.headers["x-language"] ??
      req.headers["x-locale"] ??
      "ar"; // Default to 'ar'

    next();
  }
}
