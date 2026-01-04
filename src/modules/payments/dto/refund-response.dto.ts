import { Refund } from 'src/database/entities/refund.entity';
import { RefundType } from 'src/common/enums/RefundType';
import { RefundStatus } from 'src/common/enums/RefundStatus';

export class RefundResponseDto {
  id: string;
  refundId: string;
  paymentId: string;
  amount: number;
  refundType: RefundType;
  status: RefundStatus;
  reason: string;
  adminNotes?: string;
  requestedById: string;
  requestedAt: Date;
  approvedById?: string;
  approvedAt?: Date;
  isAutomatic: boolean;
  createdAt: Date;

  constructor(refund: Refund) {
    this.id = refund.id;
    this.refundId = refund.refundId;
    this.paymentId = refund.paymentId;
    this.amount = Number(refund.amount);
    this.refundType = refund.refundType;
    this.status = refund.status;
    this.reason = refund.reason;
    this.adminNotes = refund.adminNotes;
    this.requestedById = refund.requestedById;
    this.requestedAt = refund.requestedAt;
    this.approvedById = refund.approvedById;
    this.approvedAt = refund.approvedAt;
    this.isAutomatic = refund.isAutomatic;
    this.createdAt = refund.createdAt;
  }
}
