import { Injectable, type NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { ClsService } from "nestjs-cls";
import { User } from "src/database/entities/user.entity";
import { UsersService } from "src/modules/users/users.service";
import { CURRENT_USER } from "../constants/context";

@Injectable()
export class ClsMiddleware implements NestMiddleware {
  constructor(
    private readonly clsService: ClsService,
    private readonly usersService: UsersService,
  ) {}

  async use(request: Request, _: Response, next: NextFunction) {
    const token = this.extractTokenFromHeader(request);

    this.clsService.run(async () => {
      let user: User | null = null;

      if (token) {
        try {
          user = await this.usersService.validateUserToken(token);
        } catch {}
      }

      this.clsService.set(CURRENT_USER, user);
      request.user = user;

      next();
    });
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
