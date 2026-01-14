import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserAddress } from "src/database/entities/user-address.entity";
import { BranchesModule } from "../branches/branches.module";
import { AddressesController } from "./addresses.controller";
import { AddressesService } from "./addresses.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserAddress]), BranchesModule],
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
