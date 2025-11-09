import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class JwtAuthOrGuestGuard implements CanActivate {
  constructor(private usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return true;
    }

    const token = this.extractTokenFromHeader(
      context.switchToHttp().getRequest(),
    );

    try {
      if (!token) {
        throw new UnauthorizedException('Token not found');
      }

      const user = await this.usersService.validateUserToken(token);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request['user'] = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
