import { UserAddress } from 'src/database/entities/user-address.entity';
import { AddressType } from 'src/common/enums/AddressType';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';

export class AddressResponseDto {
  id: string;
  label: BilingualStringObject;
  type: AddressType;
  addressLine1: string;
  addressLine2?: string;
  city?: string;
  area?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  deliveryInstructions?: string;
  contactPhone?: string;
  isDefault: boolean;
  isActive: boolean;
  cachedBranchId?: string;
  cachedDeliveryFee?: number;
  lastValidatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(address: UserAddress) {
    this.id = address.id;
    this.label = address.label;
    this.type = address.type;
    this.addressLine1 = address.addressLine1;
    this.addressLine2 = address.addressLine2;
    this.city = address.city;
    this.area = address.area;
    this.postalCode = address.postalCode;
    this.latitude = Number(address.latitude);
    this.longitude = Number(address.longitude);
    this.deliveryInstructions = address.deliveryInstructions;
    this.contactPhone = address.contactPhone;
    this.isDefault = address.isDefault;
    this.isActive = address.isActive;
    this.cachedBranchId = address.cachedBranchId;
    this.cachedDeliveryFee = address.cachedDeliveryFee
      ? Number(address.cachedDeliveryFee)
      : undefined;
    this.lastValidatedAt = address.lastValidatedAt;
    this.createdAt = address.createdAt;
    this.updatedAt = address.updatedAt;
  }
}
