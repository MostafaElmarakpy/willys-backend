import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AppLoggerMiddleware implements NestMiddleware {
  private logger = new Logger(`HTTP`);
  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `Logging HTTP request ip:${req.ip} method:${req.method} url:${req.url} statusCode: ${res.statusCode} params: ${JSON.stringify(req.params)} query: ${JSON.stringify(req.query)} body: ${JSON.stringify(req.body)}`,
      );
    }
    next();
  }
}
