import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export enum transformToTypeTypes {
  int = "int",
  string = "string",
}

export interface IAddParamsToBodyArgs {
  paramName: string;
  transformTo?: transformToTypeTypes;
}

export const BodyWithParam = createParamDecorator(
  (args: IAddParamsToBodyArgs, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    let value = req.params[args.paramName];

    if (args.transformTo === transformToTypeTypes.int)
      value = parseInt(value, 10);
    if (args.transformTo === transformToTypeTypes.string)
      value = value.toString();

    req.body[args.paramName] = value;

    // Return undefined to avoid overwriting the body parameter
    return undefined;
  },
);
