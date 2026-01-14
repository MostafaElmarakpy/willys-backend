import { ArrayMinSize, IsArray, IsNotEmpty, IsUUID } from "class-validator";

export class AssignDiscountToUsersDto {
  @IsNotEmpty()
  @IsUUID()
  discountId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  userIds: string[];
}

export class AssignDiscountToItemsDto {
  @IsNotEmpty()
  @IsUUID()
  discountId: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  itemIds: string[];
}

export class RemoveAssignmentDto {
  @IsNotEmpty()
  @IsUUID()
  discountId: string;

  @IsNotEmpty()
  @IsUUID()
  targetId: string;
}
