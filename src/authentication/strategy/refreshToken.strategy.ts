import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "src/config/config.service";

export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor(readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refresh"),
      ignoreExpiration: false,
      secretOrKey: configService.get("jwtSecret"),
    });
  }

  async validate(payload: any) {
    return { user: payload.id, username: payload.email };
  }
}
