import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class ValidateAddressDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class AddressValidationResponseDto {
  isDeliverable: boolean;
  branchId?: string;
  branchName?: string;
  deliveryFee?: number;
  estimatedDeliveryTime?: number;
  message: string;

  constructor(data: {
    isDeliverable: boolean;
    branchId?: string;
    branchName?: string;
    deliveryFee?: number;
    estimatedDeliveryTime?: number;
    message: string;
  }) {
    this.isDeliverable = data.isDeliverable;
    this.branchId = data.branchId;
    this.branchName = data.branchName;
    this.deliveryFee = data.deliveryFee;
    this.estimatedDeliveryTime = data.estimatedDeliveryTime;
    this.message = data.message;
  }
}
