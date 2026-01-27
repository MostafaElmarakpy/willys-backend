import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/database/entities/user.entity";
import { CustomersAdminController } from "./customers-admin.controller";
import { CustomersAdminService } from "./customers-admin.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [CustomersAdminController],
  providers: [CustomersAdminService],
  exports: [CustomersAdminService],
})
export class CustomersModule {}
