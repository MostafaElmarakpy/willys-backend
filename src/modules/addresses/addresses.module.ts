import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddress } from 'src/database/entities/user-address.entity';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserAddress]), BranchesModule],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
