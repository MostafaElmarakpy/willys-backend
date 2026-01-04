import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Version,
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { createSuccessResponse } from 'src/common/utils/api-response-wrapper';
import { PaymentsService } from './payments.service';
import { RefundsService } from './refunds.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PaymentType } from 'src/common/enums/PaymentType';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
  ) {}

  @Post()
  @Version('1')
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const payment = await this.paymentsService.createPayment(
      createPaymentDto,
      req.user.id,
      ipAddress,
      userAgent,
    );

    // Process payment based on type
    let result;
    if (createPaymentDto.paymentType === PaymentType.CARD) {
      result = await this.paymentsService.processCardPayment(
        payment.id,
        req.user.id,
      );
    } else {
      result = await this.paymentsService.processCashPayment(
        payment.id,
        req.user.id,
      );
    }

    return createSuccessResponse(result, 'Payment created successfully');
  }

  @Get()
  @Version('1')
  async getMyPayments(@Request() req: any, @Query() filterDto: PaymentFilterDto) {
    // Force userId to current user for security
    const result = await this.paymentsService.findAll({
      ...filterDto,
      userId: req.user.id,
    });

    return createSuccessResponse(result, 'Payments retrieved successfully');
  }

  @Get(':id')
  @Version('1')
  async getPayment(@Param('id') id: string, @Request() req: any) {
    const payment = await this.paymentsService.findOne(id, req.user.id);
    return createSuccessResponse(
      new PaymentResponseDto(payment),
      'Payment retrieved successfully',
    );
  }

  @Post(':id/refund')
  @Version('1')
  async requestRefund(
    @Param('id') id: string,
    @Body() createRefundDto: CreateRefundDto,
    @Request() req: any,
  ) {
    const refund = await this.refundsService.requestRefund(
      id,
      createRefundDto,
      req.user.id,
    );

    return createSuccessResponse(refund, 'Refund request submitted successfully');
  }
}
