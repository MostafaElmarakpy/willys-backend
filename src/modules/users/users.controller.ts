import { Controller, UseGuards } from "@nestjs/common";
import { Roles } from "src/common/decorators/roles.decorator";
import { UserRole } from "src/common/enums/UserRole";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { RolesGuard } from "src/common/guards/roles.guard";
import { UsersService } from "./users.service";

@Controller("user")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.user)
export class UsersController {
  constructor(readonly usersService: UsersService) {}
}
