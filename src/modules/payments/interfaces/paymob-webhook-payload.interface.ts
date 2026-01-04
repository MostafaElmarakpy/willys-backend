export interface PaymobWebhookPayload {
  type: string;
  obj: {
    id: number;
    pending: boolean;
    amount_cents: number;
    success: boolean;
    is_auth: boolean;
    is_capture: boolean;
    is_standalone_payment: boolean;
    is_voided: boolean;
    is_refunded: boolean;
    is_3d_secure: boolean;
    integration_id: number;
    profile_id: number;
    has_parent_transaction: boolean;
    order: {
      id: number;
      created_at: string;
      delivery_needed: boolean;
      merchant: any;
      collector: any;
      amount_cents: number;
      shipping_data: any;
      currency: string;
      is_payment_locked: boolean;
      merchant_order_id: string;
      wallet_notification: any;
      paid_amount_cents: number;
      notify_user_with_email: boolean;
      items: any[];
    };
    created_at: string;
    currency: string;
    source_data: {
      type: string;
      pan?: string;
      sub_type: string;
    };
    api_source: string;
    terminal_id: any;
    merchant_commission: number;
    installment: any;
    discount_details: any[];
    is_void: boolean;
    is_refund: boolean;
    data: {
      message?: string;
    };
    is_hidden: boolean;
    payment_key_claims: any;
    error_occured: boolean;
    is_live: boolean;
    other_endpoint_reference: any;
    refunded_amount_cents: number;
    source_id: number;
    is_captured: boolean;
    captured_amount: number;
    merchant_staff_tag: any;
    owner: number;
    parent_transaction: any;
    hmac?: string;
  };
}
