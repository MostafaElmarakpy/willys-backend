import * as crypto from 'crypto';

export class HmacValidator {
  static verifyPaymobWebhook(
    payload: any,
    receivedHmac: string,
    secretKey: string,
  ): boolean {
    try {
      // Extract specific fields in Paymob's required order
      const concatenatedString = [
        payload.obj.amount_cents,
        payload.obj.created_at,
        payload.obj.currency,
        payload.obj.error_occured,
        payload.obj.has_parent_transaction,
        payload.obj.id,
        payload.obj.integration_id,
        payload.obj.is_3d_secure,
        payload.obj.is_auth,
        payload.obj.is_capture,
        payload.obj.is_refunded,
        payload.obj.is_standalone_payment,
        payload.obj.is_voided,
        payload.obj.order.id,
        payload.obj.owner,
        payload.obj.pending,
        payload.obj.source_data.pan,
        payload.obj.source_data.sub_type,
        payload.obj.source_data.type,
        payload.obj.success,
      ].join('');

      // Generate HMAC
      const calculatedHmac = crypto
        .createHmac('sha512', secretKey)
        .update(concatenatedString)
        .digest('hex');

      return calculatedHmac === receivedHmac;
    } catch (_error) {
      return false;
    }
  }
}
