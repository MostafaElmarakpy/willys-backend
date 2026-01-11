import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UserAddress } from 'src/database/entities/user-address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { OrderRoutingService } from '../branches/order-routing.service';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
    private readonly orderRoutingService: OrderRoutingService,
  ) {}

  async create(userId: string, dto: CreateAddressDto): Promise<UserAddress> {
    // If this is the first address or marked as default, handle default logic
    if (dto.isDefault) {
      await this.clearDefaultAddress(userId);
    }

    // Check if user has any addresses, if not make this default
    const existingAddresses = await this.addressRepository.count({
      where: { userId, deletedAt: IsNull() },
    });

    const isDefault = dto.isDefault || existingAddresses === 0;

    // Validate delivery zone and cache branch info
    const routingResult = await this.orderRoutingService.routeOrder({
      latitude: dto.latitude,
      longitude: dto.longitude,
    });

    const address = this.addressRepository.create({
      ...dto,
      userId,
      isDefault,
      isActive: true,
      cachedBranchId: routingResult.assignedBranch?.id,
      cachedDeliveryFee: routingResult.deliveryFee,
      lastValidatedAt: new Date(),
    });

    return this.addressRepository.save(address);
  }

  async findAll(userId: string): Promise<UserAddress[]> {
    return this.addressRepository.find({
      where: { userId, isActive: true, deletedAt: IsNull() },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<UserAddress> {
    const address = await this.addressRepository.findOne({
      where: { id, userId, deletedAt: IsNull() },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateAddressDto,
  ): Promise<UserAddress> {
    const address = await this.findOne(userId, id);

    // If setting as default, clear other defaults
    if (dto.isDefault) {
      await this.clearDefaultAddress(userId);
    }

    // If location changed, revalidate delivery zone
    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const latitude = dto.latitude ?? Number(address.latitude);
      const longitude = dto.longitude ?? Number(address.longitude);

      const routingResult = await this.orderRoutingService.routeOrder({
        latitude,
        longitude,
      });

      address.cachedBranchId = routingResult.assignedBranch?.id;
      address.cachedDeliveryFee = routingResult.deliveryFee;
      address.lastValidatedAt = new Date();
    }

    Object.assign(address, dto);
    return this.addressRepository.save(address);
  }

  async remove(userId: string, id: string): Promise<void> {
    const address = await this.findOne(userId, id);

    // If deleting default address, set another as default
    if (address.isDefault) {
      const otherAddress = await this.addressRepository.findOne({
        where: { userId, deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });

      if (otherAddress && otherAddress.id !== id) {
        otherAddress.isDefault = true;
        await this.addressRepository.save(otherAddress);
      }
    }

    // Soft delete
    await this.addressRepository.softDelete(id);
  }

  async setDefault(userId: string, id: string): Promise<UserAddress> {
    const address = await this.findOne(userId, id);

    await this.clearDefaultAddress(userId);

    address.isDefault = true;
    return this.addressRepository.save(address);
  }

  async validateAddress(
    latitude: number,
    longitude: number,
  ): Promise<{
    isDeliverable: boolean;
    branchId?: string;
    branchName?: string;
    deliveryFee?: number;
    estimatedDeliveryTime?: number;
    message: string;
  }> {
    const routingResult = await this.orderRoutingService.routeOrder({
      latitude,
      longitude,
    });

    if (!routingResult.canDeliver) {
      return {
        isDeliverable: false,
        message: routingResult.message,
      };
    }

    return {
      isDeliverable: true,
      branchId: routingResult.assignedBranch?.id,
      branchName:
        typeof routingResult.assignedBranch?.name === 'object'
          ? routingResult.assignedBranch.name.en
          : routingResult.assignedBranch?.name,
      deliveryFee: routingResult.deliveryFee,
      estimatedDeliveryTime: routingResult.estimatedDeliveryTime,
      message: routingResult.message,
    };
  }

  async getDefaultAddress(userId: string): Promise<UserAddress | null> {
    return this.addressRepository.findOne({
      where: { userId, isDefault: true, isActive: true, deletedAt: IsNull() },
    });
  }

  async revalidateAddress(userId: string, id: string): Promise<UserAddress> {
    const address = await this.findOne(userId, id);

    const routingResult = await this.orderRoutingService.routeOrder({
      latitude: Number(address.latitude),
      longitude: Number(address.longitude),
    });

    address.cachedBranchId = routingResult.assignedBranch?.id;
    address.cachedDeliveryFee = routingResult.deliveryFee;
    address.lastValidatedAt = new Date();

    return this.addressRepository.save(address);
  }

  private async clearDefaultAddress(userId: string): Promise<void> {
    await this.addressRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );
  }
}
