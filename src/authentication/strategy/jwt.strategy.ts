import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';
import { ConfigService } from 'src/config/config.service';

export type JwtPayload = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  phoneNumberCountryCode: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: JwtStrategy.extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.get('jwtSecret') as string,
    });
  }

  private static extractJwtFromRequest(req: any): string | null {
    return (
      req?.cookies?.['access_token'] ??
      ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    );
  }

  async validate(payload: JwtPayload) {
    const { id } = payload;

    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
