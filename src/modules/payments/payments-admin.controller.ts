import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Version,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/UserRole';
import { createSuccessResponse } from 'src/common/utils/api-response-wrapper';
import { PaymentsService } from './payments.service';
import { RefundsService } from './refunds.service';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { ApproveRefundDto } from './dto/approve-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('admin/payments')
export class PaymentsAdminController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
  ) {}

  @Get()
  @Version('1')
  async getAllPayments(@Query() filterDto: PaymentFilterDto) {
    const result = await this.paymentsService.findAll(filterDto);
    return createSuccessResponse(result, 'Payments retrieved successfully');
  }

  @Get('stats')
  @Version('1')
  async getPaymentStatistics() {
    const stats = await this.paymentsService.getPaymentStatistics();
    return createSuccessResponse(stats, 'Payment statistics retrieved successfully');
  }

  @Get(':id')
  @Version('1')
  async getPaymentDetails(@Param('id') id: string) {
    const payment = await this.paymentsService.findOne(id);

    return createSuccessResponse(
      {
        payment: new PaymentResponseDto(payment),
        logs: payment.transactionLogs,
        refunds: payment.refunds,
      },
      'Payment details retrieved successfully',
    );
  }

  @Get('refunds/pending')
  @Version('1')
  async getPendingRefunds() {
    const refunds = await this.refundsService.findAll({ status: 'PENDING' });
    return createSuccessResponse(refunds, 'Pending refunds retrieved successfully');
  }

  @Get('refunds/all')
  @Version('1')
  async getAllRefunds(@Query('status') status?: string) {
    const filters = status ? { status } : undefined;
    const refunds = await this.refundsService.findAll(filters);
    return createSuccessResponse(refunds, 'Refunds retrieved successfully');
  }

  @Post('refunds/:id/approve')
  @Version('1')
  async approveRefund(
    @Param('id') id: string,
    @Body() approveRefundDto: ApproveRefundDto,
    @Request() req: any,
  ) {
    const refund = await this.refundsService.approveRefund(
      id,
      req.user.id,
      approveRefundDto,
    );

    return createSuccessResponse(refund, 'Refund approved and processed successfully');
  }

  @Post('refunds/:id/reject')
  @Version('1')
  async rejectRefund(
    @Param('id') id: string,
    @Body() rejectRefundDto: RejectRefundDto,
    @Request() req: any,
  ) {
    const refund = await this.refundsService.rejectRefund(
      id,
      req.user.id,
      rejectRefundDto,
    );

    return createSuccessResponse(refund, 'Refund rejected successfully');
  }
}
