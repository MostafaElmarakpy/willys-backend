import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  Version,
} from "@nestjs/common";
import { Permission } from "src/common/decorators/permissions.decorator";
import { PermissionAction } from "src/common/enums/PermissionAction";
import { PermissionModule } from "src/common/enums/PermissionModule";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/common/guards/permissions.guard";
import { createSuccessResponse } from "src/common/utils/api-response-wrapper";
import { ApproveRefundDto } from "./dto/approve-refund.dto";
import { PaymentFilterDto } from "./dto/payment-filter.dto";
import { PaymentResponseDto } from "./dto/payment-response.dto";
import { RejectRefundDto } from "./dto/reject-refund.dto";
import { PaymentsService } from "./payments.service";
import { RefundsService } from "./refunds.service";

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/payments")
export class PaymentsAdminController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly refundsService: RefundsService,
  ) {}

  @Get()
  @Version("1")
  @Permission(PermissionModule.PAYMENTS, PermissionAction.READ)
  async getAllPayments(@Query() filterDto: PaymentFilterDto) {
    const result = await this.paymentsService.findAll(filterDto);
    return createSuccessResponse(result, "Payments retrieved successfully");
  }

  @Get("stats")
  @Version("1")
  @Permission(PermissionModule.PAYMENTS, PermissionAction.VIEW_STATS)
  async getPaymentStatistics() {
    const stats = await this.paymentsService.getPaymentStatistics();
    return createSuccessResponse(
      stats,
      "Payment statistics retrieved successfully",
    );
  }

  @Get(":id")
  @Version("1")
  @Permission(PermissionModule.PAYMENTS, PermissionAction.READ)
  async getPaymentDetails(@Param("id") id: string) {
    const payment = await this.paymentsService.findOne(id);

    return createSuccessResponse(
      {
        payment: new PaymentResponseDto(payment),
        logs: payment.transactionLogs,
        refunds: payment.refunds,
      },
      "Payment details retrieved successfully",
    );
  }

  @Get("refunds/pending")
  @Version("1")
  @Permission(PermissionModule.REFUNDS, PermissionAction.READ)
  async getPendingRefunds() {
    const refunds = await this.refundsService.findAll({ status: "PENDING" });
    return createSuccessResponse(
      refunds,
      "Pending refunds retrieved successfully",
    );
  }

  @Get("refunds/all")
  @Version("1")
  @Permission(PermissionModule.REFUNDS, PermissionAction.READ)
  async getAllRefunds(@Query("status") status?: string) {
    const filters = status ? { status } : undefined;
    const refunds = await this.refundsService.findAll(filters);
    return createSuccessResponse(refunds, "Refunds retrieved successfully");
  }

  @Post("refunds/:id/approve")
  @Version("1")
  @Permission(PermissionModule.REFUNDS, PermissionAction.APPROVE)
  async approveRefund(
    @Param("id") id: string,
    @Body() approveRefundDto: ApproveRefundDto,
    @Request() req: any,
  ) {
    const refund = await this.refundsService.approveRefund(
      id,
      req.user.id,
      approveRefundDto,
    );

    return createSuccessResponse(
      refund,
      "Refund approved and processed successfully",
    );
  }

  @Post("refunds/:id/reject")
  @Version("1")
  @Permission(PermissionModule.REFUNDS, PermissionAction.REJECT)
  async rejectRefund(
    @Param("id") id: string,
    @Body() rejectRefundDto: RejectRefundDto,
    @Request() req: any,
  ) {
    const refund = await this.refundsService.rejectRefund(
      id,
      req.user.id,
      rejectRefundDto,
    );

    return createSuccessResponse(refund, "Refund rejected successfully");
  }
}
