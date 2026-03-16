export interface CheckoutInput {
  payment_method?: string;
  platform_voucher_code?: string;
  platform_discount_voucher_code?: string;
  platform_shipping_voucher_code?: string;
  shipping_methods?: Record<string, string>;
}
