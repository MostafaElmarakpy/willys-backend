import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethod } from 'src/database/entities/payment-method.entity';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;
  let paymentMethodRepository: jest.Mocked<Repository<PaymentMethod>>;

  const mockUserId = 'user-123';
  const mockPaymentMethodId = 'payment-method-123';

  const mockPaymentMethod: Partial<PaymentMethod> = {
    id: mockPaymentMethodId,
    userId: mockUserId,
    paymobToken: 'paymob-token-123',
    cardLastFourDigits: '1234',
    cardBrand: 'Visa',
    expiryMonth: '12',
    expiryYear: '2025',
    cardHolderName: 'John Doe',
    nickname: 'My Visa Card',
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        {
          provide: getRepositoryToken(PaymentMethod),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
    paymentMethodRepository = module.get(getRepositoryToken(PaymentMethod));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('savePaymentMethod', () => {
    it('should save a new payment method successfully', async () => {
      const saveDto = {
        paymobToken: 'paymob-token-123',
        cardLastFourDigits: '1234',
        cardBrand: 'Visa',
        expiryMonth: '12',
        expiryYear: '2025',
        cardHolderName: 'John Doe',
        nickname: 'My Visa Card',
        isDefault: false,
      };

      paymentMethodRepository.create.mockReturnValue(
        mockPaymentMethod as PaymentMethod,
      );
      paymentMethodRepository.save.mockResolvedValue(
        mockPaymentMethod as PaymentMethod,
      );

      const result = await service.savePaymentMethod(saveDto, mockUserId);

      expect(result).toBeDefined();
      expect(result.cardLastFourDigits).toBe('1234');
      expect(paymentMethodRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          paymobToken: 'paymob-token-123',
          cardLastFourDigits: '1234',
          isActive: true,
        }),
      );
    });

    it('should unset other defaults when saving as default', async () => {
      const saveDto = {
        paymobToken: 'paymob-token-123',
        cardLastFourDigits: '1234',
        cardBrand: 'Visa',
        isDefault: true,
      };

      paymentMethodRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymentMethodRepository.create.mockReturnValue({
        ...mockPaymentMethod,
        isDefault: true,
      } as PaymentMethod);
      paymentMethodRepository.save.mockResolvedValue({
        ...mockPaymentMethod,
        isDefault: true,
      } as PaymentMethod);

      await service.savePaymentMethod(saveDto, mockUserId);

      expect(paymentMethodRepository.update).toHaveBeenCalledWith(
        { userId: mockUserId, isDefault: true },
        { isDefault: false },
      );
    });

    it('should not unset defaults if not saving as default', async () => {
      const saveDto = {
        paymobToken: 'paymob-token-123',
        cardLastFourDigits: '1234',
        cardBrand: 'Visa',
        isDefault: false,
      };

      paymentMethodRepository.create.mockReturnValue(
        mockPaymentMethod as PaymentMethod,
      );
      paymentMethodRepository.save.mockResolvedValue(
        mockPaymentMethod as PaymentMethod,
      );

      await service.savePaymentMethod(saveDto, mockUserId);

      expect(paymentMethodRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('findUserPaymentMethods', () => {
    it('should return user payment methods ordered by default and createdAt', async () => {
      const paymentMethods = [
        { ...mockPaymentMethod, isDefault: true },
        { ...mockPaymentMethod, id: 'pm-2', isDefault: false },
      ];

      paymentMethodRepository.find.mockResolvedValue(
        paymentMethods as PaymentMethod[],
      );

      const result = await service.findUserPaymentMethods(mockUserId);

      expect(result).toHaveLength(2);
      expect(paymentMethodRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId, isActive: true },
        order: { isDefault: 'DESC', createdAt: 'DESC' },
      });
    });

    it('should return empty array if no payment methods found', async () => {
      paymentMethodRepository.find.mockResolvedValue([]);

      const result = await service.findUserPaymentMethods(mockUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a payment method by id and userId', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(
        mockPaymentMethod as PaymentMethod,
      );

      const result = await service.findOne(mockPaymentMethodId, mockUserId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockPaymentMethodId);
      expect(paymentMethodRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPaymentMethodId, userId: mockUserId, isActive: true },
      });
    });

    it('should throw NotFoundException if payment method not found', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(mockPaymentMethodId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setDefault', () => {
    it('should set a payment method as default', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(
        mockPaymentMethod as PaymentMethod,
      );
      paymentMethodRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymentMethodRepository.save.mockResolvedValue({
        ...mockPaymentMethod,
        isDefault: true,
      } as PaymentMethod);

      const result = await service.setDefault(mockPaymentMethodId, mockUserId);

      expect(result).toBeDefined();
      expect(paymentMethodRepository.update).toHaveBeenCalledWith(
        { userId: mockUserId, isDefault: true },
        { isDefault: false },
      );
      expect(paymentMethodRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isDefault: true,
        }),
      );
    });

    it('should throw NotFoundException if payment method not found', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setDefault(mockPaymentMethodId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a payment method by setting isActive to false', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(
        mockPaymentMethod as PaymentMethod,
      );
      paymentMethodRepository.save.mockResolvedValue({
        ...mockPaymentMethod,
        isActive: false,
      } as PaymentMethod);

      await service.remove(mockPaymentMethodId, mockUserId);

      expect(paymentMethodRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: false,
        }),
      );
    });

    it('should throw NotFoundException if payment method not found', async () => {
      paymentMethodRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove(mockPaymentMethodId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
