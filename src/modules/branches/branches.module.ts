import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { OrderRoutingService } from './order-routing.service';
import { Branch } from '../../database/entities/branch.entity';
import { Zone } from '../../database/entities/zone.entity';
import { BranchExistsRule } from '../../common/decorators/is-branch-exists.decorator';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, Zone])],
  controllers: [BranchesController, ZonesController],
  providers: [
    BranchesService,
    ZonesService,
    OrderRoutingService,
    BranchExistsRule,
  ],
  exports: [BranchesService, ZonesService, OrderRoutingService],
})
export class BranchesModule {}
