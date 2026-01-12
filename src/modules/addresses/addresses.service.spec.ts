import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { UserAddress } from 'src/database/entities/user-address.entity';
import { OrderRoutingService } from '../branches/order-routing.service';
import { AddressType } from 'src/common/enums/AddressType';

describe('AddressesService', () => {
  let service: AddressesService;
  let addressRepository: jest.Mocked<Repository<UserAddress>>;
  let orderRoutingService: jest.Mocked<OrderRoutingService>;

  const mockUserId = 'user-123';
  const mockAddressId = 'address-123';

  const mockAddress: Partial<UserAddress> = {
    id: mockAddressId,
    userId: mockUserId,
    label: { en: 'Home', ar: 'المنزل' },
    type: AddressType.HOME,
    addressLine1: '123 Main Street',
    city: 'Cairo',
    area: 'Maadi',
    latitude: 30.0444,
    longitude: 31.2357,
    isDefault: true,
    isActive: true,
    cachedBranchId: 'branch-123',
    cachedDeliveryFee: 15,
    lastValidatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRoutingResult = {
    canDeliver: true,
    assignedBranch: {
      id: 'branch-123',
      name: { en: 'Main Branch', ar: 'الفرع الرئيسي' },
    },
    deliveryFee: 15,
    estimatedDeliveryTime: 30,
    message: 'Delivery available',
    alternativeBranches: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressesService,
        {
          provide: getRepositoryToken(UserAddress),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: OrderRoutingService,
          useValue: {
            routeOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AddressesService>(AddressesService);
    addressRepository = module.get(getRepositoryToken(UserAddress));
    orderRoutingService = module.get(OrderRoutingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new address successfully', async () => {
      const createAddressDto = {
        label: { en: 'Home', ar: 'المنزل' },
        type: AddressType.HOME,
        addressLine1: '123 Main Street',
        latitude: 30.0444,
        longitude: 31.2357,
      };

      addressRepository.count.mockResolvedValue(0);
      orderRoutingService.routeOrder.mockResolvedValue(
        mockRoutingResult as any,
      );
      addressRepository.create.mockReturnValue(mockAddress as UserAddress);
      addressRepository.save.mockResolvedValue(mockAddress as UserAddress);

      const result = await service.create(mockUserId, createAddressDto);

      expect(result).toBeDefined();
      expect(orderRoutingService.routeOrder).toHaveBeenCalledWith({
        latitude: createAddressDto.latitude,
        longitude: createAddressDto.longitude,
      });
      expect(addressRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          isDefault: true,
          isActive: true,
          cachedBranchId: 'branch-123',
          cachedDeliveryFee: 15,
        }),
      );
    });

    it('should set first address as default automatically', async () => {
      const createAddressDto = {
        label: { en: 'Home', ar: 'المنزل' },
        type: AddressType.HOME,
        addressLine1: '123 Main Street',
        latitude: 30.0444,
        longitude: 31.2357,
        isDefault: false,
      };

      addressRepository.count.mockResolvedValue(0);
      orderRoutingService.routeOrder.mockResolvedValue(
        mockRoutingResult as any,
      );
      addressRepository.create.mockReturnValue(mockAddress as UserAddress);
      addressRepository.save.mockResolvedValue(mockAddress as UserAddress);

      await service.create(mockUserId, createAddressDto);

      expect(addressRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isDefault: true,
        }),
      );
    });

    it('should clear other defaults when creating default address', async () => {
      const createAddressDto = {
        label: { en: 'Work', ar: 'العمل' },
        type: AddressType.WORK,
        addressLine1: '456 Office Street',
        latitude: 30.0555,
        longitude: 31.2456,
        isDefault: true,
      };

      addressRepository.count.mockResolvedValue(1);
      addressRepository.update.mockResolvedValue({ affected: 1 } as any);
      orderRoutingService.routeOrder.mockResolvedValue(
        mockRoutingResult as any,
      );
      addressRepository.create.mockReturnValue(mockAddress as UserAddress);
      addressRepository.save.mockResolvedValue(mockAddress as UserAddress);

      await service.create(mockUserId, createAddressDto);

      expect(addressRepository.update).toHaveBeenCalledWith(
        { userId: mockUserId, isDefault: true },
        { isDefault: false },
      );
    });

    it('should cache branch info from routing result', async () => {
      const createAddressDto = {
        label: { en: 'Home', ar: 'المنزل' },
        type: AddressType.HOME,
        addressLine1: '123 Main Street',
        latitude: 30.0444,
        longitude: 31.2357,
      };

      addressRepository.count.mockResolvedValue(0);
      orderRoutingService.routeOrder.mockResolvedValue({
        ...mockRoutingResult,
        assignedBranch: { id: 'branch-456' },
        deliveryFee: 20,
      } as any);
      addressRepository.create.mockReturnValue(mockAddress as UserAddress);
      addressRepository.save.mockResolvedValue(mockAddress as UserAddress);

      await service.create(mockUserId, createAddressDto);

      expect(addressRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedBranchId: 'branch-456',
          cachedDeliveryFee: 20,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all active addresses for user', async () => {
      addressRepository.find.mockResolvedValue([mockAddress as UserAddress]);

      const result = await service.findAll(mockUserId);

      expect(result).toHaveLength(1);
      expect(addressRepository.find).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isActive: true,
          deletedAt: expect.anything(),
        },
        order: { isDefault: 'DESC', createdAt: 'DESC' },
      });
    });

    it('should return empty array if no addresses', async () => {
      addressRepository.find.mockResolvedValue([]);

      const result = await service.findAll(mockUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return an address by id', async () => {
      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);

      const result = await service.findOne(mockUserId, mockAddressId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockAddressId);
    });

    it('should throw NotFoundException if address not found', async () => {
      addressRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, mockAddressId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an address successfully', async () => {
      const updateAddressDto = {
        label: { en: 'Updated Home', ar: 'المنزل المحدث' },
        addressLine1: '789 New Street',
      };

      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);
      addressRepository.save.mockResolvedValue({
        ...mockAddress,
        ...updateAddressDto,
      } as UserAddress);

      const result = await service.update(
        mockUserId,
        mockAddressId,
        updateAddressDto,
      );

      expect(result.label.en).toBe('Updated Home');
    });

    it('should clear other defaults when setting as default', async () => {
      const updateAddressDto = { isDefault: true };

      addressRepository.findOne.mockResolvedValue({
        ...mockAddress,
        isDefault: false,
      } as UserAddress);
      addressRepository.update.mockResolvedValue({ affected: 1 } as any);
      addressRepository.save.mockResolvedValue({
        ...mockAddress,
        isDefault: true,
      } as UserAddress);

      await service.update(mockUserId, mockAddressId, updateAddressDto);

      expect(addressRepository.update).toHaveBeenCalledWith(
        { userId: mockUserId, isDefault: true },
        { isDefault: false },
      );
    });

    it('should revalidate delivery zone when location changes', async () => {
      const updateAddressDto = {
        latitude: 30.0555,
        longitude: 31.2456,
      };

      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);
      orderRoutingService.routeOrder.mockResolvedValue({
        ...mockRoutingResult,
        assignedBranch: { id: 'branch-456' },
        deliveryFee: 25,
      } as any);
      addressRepository.save.mockResolvedValue({
        ...mockAddress,
        ...updateAddressDto,
        cachedBranchId: 'branch-456',
        cachedDeliveryFee: 25,
      } as UserAddress);

      const result = await service.update(
        mockUserId,
        mockAddressId,
        updateAddressDto,
      );

      expect(orderRoutingService.routeOrder).toHaveBeenCalledWith({
        latitude: 30.0555,
        longitude: 31.2456,
      });
      expect(result.cachedBranchId).toBe('branch-456');
    });

    it('should use existing coordinates if only one is updated', async () => {
      const updateAddressDto = { latitude: 30.0666 };

      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);
      orderRoutingService.routeOrder.mockResolvedValue(
        mockRoutingResult as any,
      );
      addressRepository.save.mockResolvedValue(mockAddress as UserAddress);

      await service.update(mockUserId, mockAddressId, updateAddressDto);

      expect(orderRoutingService.routeOrder).toHaveBeenCalledWith({
        latitude: 30.0666,
        longitude: Number(mockAddress.longitude),
      });
    });

    it('should throw NotFoundException if address not found', async () => {
      addressRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockUserId, mockAddressId, {
          label: { en: 'Test', ar: 'اختبار' },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an address', async () => {
      const nonDefaultAddress = { ...mockAddress, isDefault: false };
      addressRepository.findOne.mockResolvedValue(
        nonDefaultAddress as UserAddress,
      );
      addressRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockUserId, mockAddressId);

      expect(addressRepository.softDelete).toHaveBeenCalledWith(mockAddressId);
    });

    it('should set another address as default when deleting default', async () => {
      const defaultAddress = { ...mockAddress, isDefault: true };
      const otherAddress = {
        ...mockAddress,
        id: 'address-456',
        isDefault: false,
      };

      addressRepository.findOne
        .mockResolvedValueOnce(defaultAddress as UserAddress)
        .mockResolvedValueOnce(otherAddress as UserAddress);
      addressRepository.save.mockResolvedValue({
        ...otherAddress,
        isDefault: true,
      } as UserAddress);
      addressRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockUserId, mockAddressId);

      expect(addressRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'address-456',
          isDefault: true,
        }),
      );
    });

    it('should not set new default if no other addresses exist', async () => {
      const defaultAddress = { ...mockAddress, isDefault: true };

      addressRepository.findOne
        .mockResolvedValueOnce(defaultAddress as UserAddress)
        .mockResolvedValueOnce(null);
      addressRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockUserId, mockAddressId);

      expect(addressRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if address not found', async () => {
      addressRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockUserId, mockAddressId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('setDefault', () => {
    it('should set an address as default', async () => {
      const nonDefaultAddress = { ...mockAddress, isDefault: false };

      addressRepository.findOne.mockResolvedValue(
        nonDefaultAddress as UserAddress,
      );
      addressRepository.update.mockResolvedValue({ affected: 1 } as any);
      addressRepository.save.mockResolvedValue({
        ...nonDefaultAddress,
        isDefault: true,
      } as UserAddress);

      const result = await service.setDefault(mockUserId, mockAddressId);

      expect(result.isDefault).toBe(true);
      expect(addressRepository.update).toHaveBeenCalledWith(
        { userId: mockUserId, isDefault: true },
        { isDefault: false },
      );
    });

    it('should throw NotFoundException if address not found', async () => {
      addressRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setDefault(mockUserId, mockAddressId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateAddress', () => {
    it('should return deliverable result for valid address', async () => {
      orderRoutingService.routeOrder.mockResolvedValue(
        mockRoutingResult as any,
      );

      const result = await service.validateAddress(30.0444, 31.2357);

      expect(result.isDeliverable).toBe(true);
      expect(result.branchId).toBe('branch-123');
      expect(result.branchName).toBe('Main Branch');
      expect(result.deliveryFee).toBe(15);
      expect(result.estimatedDeliveryTime).toBe(30);
    });

    it('should return non-deliverable result for out-of-zone address', async () => {
      orderRoutingService.routeOrder.mockResolvedValue({
        canDeliver: false,
        message: 'Outside delivery zone',
        alternativeBranches: [],
      } as any);

      const result = await service.validateAddress(0, 0);

      expect(result.isDeliverable).toBe(false);
      expect(result.message).toBe('Outside delivery zone');
      expect(result.branchId).toBeUndefined();
    });

    it('should handle string branch name', async () => {
      orderRoutingService.routeOrder.mockResolvedValue({
        ...mockRoutingResult,
        assignedBranch: { id: 'branch-123', name: 'Simple Branch Name' },
      } as any);

      const result = await service.validateAddress(30.0444, 31.2357);

      expect(result.branchName).toBe('Simple Branch Name');
    });
  });

  describe('getDefaultAddress', () => {
    it('should return the default address', async () => {
      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);

      const result = await service.getDefaultAddress(mockUserId);

      expect(result).toBeDefined();
      expect(result?.isDefault).toBe(true);
      expect(addressRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          isDefault: true,
          isActive: true,
          deletedAt: expect.anything(),
        },
      });
    });

    it('should return null if no default address', async () => {
      addressRepository.findOne.mockResolvedValue(null);

      const result = await service.getDefaultAddress(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('revalidateAddress', () => {
    it('should revalidate and update cached branch info', async () => {
      const newRoutingResult = {
        ...mockRoutingResult,
        assignedBranch: { id: 'branch-789' },
        deliveryFee: 30,
      };

      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);
      orderRoutingService.routeOrder.mockResolvedValue(newRoutingResult as any);
      addressRepository.save.mockResolvedValue({
        ...mockAddress,
        cachedBranchId: 'branch-789',
        cachedDeliveryFee: 30,
      } as UserAddress);

      const result = await service.revalidateAddress(mockUserId, mockAddressId);

      expect(orderRoutingService.routeOrder).toHaveBeenCalledWith({
        latitude: Number(mockAddress.latitude),
        longitude: Number(mockAddress.longitude),
      });
      expect(result.cachedBranchId).toBe('branch-789');
      expect(result.cachedDeliveryFee).toBe(30);
    });

    it('should update lastValidatedAt timestamp', async () => {
      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);
      orderRoutingService.routeOrder.mockResolvedValue(
        mockRoutingResult as any,
      );
      addressRepository.save.mockImplementation((address) =>
        Promise.resolve(address as UserAddress),
      );

      await service.revalidateAddress(mockUserId, mockAddressId);

      expect(addressRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastValidatedAt: expect.any(Date),
        }),
      );
    });

    it('should throw NotFoundException if address not found', async () => {
      addressRepository.findOne.mockResolvedValue(null);

      await expect(
        service.revalidateAddress(mockUserId, mockAddressId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
