import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

export enum TransformToTypeTypes {
  int = 'int',
  string = 'string',
}

export interface IAddParamsToBodyArgs {
  paramName: string;
  transformTo?: TransformToTypeTypes;
}

@Injectable()
export class AddParamToBodyInterceptor implements NestInterceptor {
  constructor(private args: IAddParamsToBodyArgs) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    let value = req.params[this.args.paramName];

    if (this.args.transformTo === TransformToTypeTypes.int)
      value = parseInt(value);
    if (this.args.transformTo === TransformToTypeTypes.string)
      value = value.toString();

    // Ensure req.body is an object
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      req.body = {};
    }

    req.body[this.args.paramName] = value;

    return next.handle();
  }
}
