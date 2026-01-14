import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from "class-validator";
import { OrderType } from "src/common/enums/OrderType";

export class SetOrderTypeDto {
  @IsNotEmpty()
  @IsEnum(OrderType)
  orderType: OrderType;
}

export class SetBranchDto {
  @IsNotEmpty()
  @IsUUID()
  branchId: string;
}

export class SetDeliveryAddressDto {
  @IsNotEmpty()
  @IsUUID()
  deliveryAddressId: string;
}

export class SetPickupTimeDto {
  @IsOptional()
  @IsDateString()
  scheduledPickupTime?: string;
}
