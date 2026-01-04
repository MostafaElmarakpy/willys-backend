import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from 'src/database/entities/payment-method.entity';
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
  ) {}

  async savePaymentMethod(
    dto: SavePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethodResponseDto> {
    // If setting as default, unset other defaults first
    if (dto.isDefault) {
      await this.paymentMethodRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );
    }

    const paymentMethod = this.paymentMethodRepository.create({
      userId,
      paymobToken: dto.paymobToken,
      cardLastFourDigits: dto.cardLastFourDigits,
      cardBrand: dto.cardBrand,
      expiryMonth: dto.expiryMonth,
      expiryYear: dto.expiryYear,
      cardHolderName: dto.cardHolderName,
      nickname: dto.nickname,
      isDefault: dto.isDefault || false,
      isActive: true,
    });

    const saved = await this.paymentMethodRepository.save(paymentMethod);

    this.logger.log(`Payment method saved for user ${userId}`);

    return new PaymentMethodResponseDto(saved);
  }

  async findUserPaymentMethods(
    userId: string,
  ): Promise<PaymentMethodResponseDto[]> {
    const paymentMethods = await this.paymentMethodRepository.find({
      where: { userId, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    return paymentMethods.map(
      (method) => new PaymentMethodResponseDto(method),
    );
  }

  async findOne(id: string, userId: string): Promise<PaymentMethod> {
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id, userId, isActive: true },
    });

    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    return paymentMethod;
  }

  async setDefault(
    id: string,
    userId: string,
  ): Promise<PaymentMethodResponseDto> {
    const paymentMethod = await this.findOne(id, userId);

    // Unset all other defaults
    await this.paymentMethodRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Set this one as default
    paymentMethod.isDefault = true;
    await this.paymentMethodRepository.save(paymentMethod);

    this.logger.log(`Payment method ${id} set as default for user ${userId}`);

    return new PaymentMethodResponseDto(paymentMethod);
  }

  async remove(id: string, userId: string): Promise<void> {
    const paymentMethod = await this.findOne(id, userId);

    // Soft delete by setting isActive to false
    paymentMethod.isActive = false;
    await this.paymentMethodRepository.save(paymentMethod);

    this.logger.log(`Payment method ${id} removed for user ${userId}`);
  }
}
