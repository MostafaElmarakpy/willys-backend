import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BranchExistsRule } from "../../common/decorators/is-branch-exists.decorator";
import { Branch } from "../../database/entities/branch.entity";
import { Zone } from "../../database/entities/zone.entity";
import { BranchesController } from "./branches.controller";
import { BranchesService } from "./branches.service";
import { BranchesPublicController } from "./branches-public.controller";
import { OrderRoutingService } from "./order-routing.service";
import { ZonesController } from "./zones.controller";
import { ZonesService } from "./zones.service";
import { ZonesPublicController } from "./zones-public.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Branch, Zone])],
  controllers: [
    BranchesController,
    BranchesPublicController,
    ZonesController,
    ZonesPublicController,
  ],
  providers: [
    BranchesService,
    ZonesService,
    OrderRoutingService,
    BranchExistsRule,
  ],
  exports: [BranchesService, ZonesService, OrderRoutingService],
})
export class BranchesModule {}
