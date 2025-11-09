import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `Request... ip:${req.ip} method:${req.method} url:${req.url} statusCode: ${res.statusCode} params: ${JSON.stringify(req.params)} query: ${JSON.stringify(req.query)} body: ${JSON.stringify(req.body)}`,
      );
    }
    next();
  }
}
