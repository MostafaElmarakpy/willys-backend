import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "src/config/config.service";
import { UsersService } from "src/modules/users/users.service";

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
    readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: JwtStrategy.extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.get("jwtSecret") as string,
    });
  }

  private static extractJwtFromRequest(req: any): string | null {
    return (
      req?.cookies?.access_token ??
      ExtractJwt.fromAuthHeaderAsBearerToken()(req)
    );
  }

  async validate(payload: JwtPayload) {
    const { id } = payload;

    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new UnauthorizedException("Invalid token");
    }

    return user;
  }
}
