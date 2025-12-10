import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { OrderRoutingService } from './order-routing.service';
import { Branch } from '../../database/entities/branch.entity';
import { Zone } from '../../database/entities/zone.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Branch, Zone]),
  ],
  controllers: [BranchesController, ZonesController],
  providers: [BranchesService, ZonesService, OrderRoutingService],
  exports: [BranchesService, ZonesService, OrderRoutingService],
})
export class BranchesModule {}