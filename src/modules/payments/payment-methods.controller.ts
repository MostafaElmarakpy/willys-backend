import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Version,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { createSuccessResponse } from 'src/common/utils/api-response-wrapper';
import { PaymentMethodsService } from './payment-methods.service';
import { SavePaymentMethodDto } from './dto/save-payment-method.dto';

@UseGuards(JwtAuthGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  @Version('1')
  async savePaymentMethod(
    @Body() savePaymentMethodDto: SavePaymentMethodDto,
    @Request() req: any,
  ) {
    const paymentMethod = await this.paymentMethodsService.savePaymentMethod(
      savePaymentMethodDto,
      req.user.id,
    );

    return createSuccessResponse(
      paymentMethod,
      'Payment method saved successfully',
    );
  }

  @Get()
  @Version('1')
  async getMyPaymentMethods(@Request() req: any) {
    const paymentMethods =
      await this.paymentMethodsService.findUserPaymentMethods(req.user.id);

    return createSuccessResponse(
      paymentMethods,
      'Payment methods retrieved successfully',
    );
  }

  @Patch(':id/default')
  @Version('1')
  async setDefault(@Param('id') id: string, @Request() req: any) {
    const paymentMethod = await this.paymentMethodsService.setDefault(
      id,
      req.user.id,
    );

    return createSuccessResponse(
      paymentMethod,
      'Default payment method updated successfully',
    );
  }

  @Delete(':id')
  @Version('1')
  async removePaymentMethod(@Param('id') id: string, @Request() req: any) {
    await this.paymentMethodsService.remove(id, req.user.id);

    return createSuccessResponse(null, 'Payment method removed successfully');
  }
}
