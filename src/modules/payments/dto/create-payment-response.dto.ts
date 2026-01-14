import { PaymentResponseDto } from "./payment-response.dto";

export class CreatePaymentResponseDto {
  payment: PaymentResponseDto;
  iframeUrl?: string;
  redirectUrl?: string;
  cashReferenceNumber?: string;
}
