export interface CheckoutInput {
  cart_item_ids?: string[];
  payment_method?: string;
  platform_voucher_code?: string;
  platform_discount_voucher_code?: string;
  platform_shipping_voucher_code?: string;
  shop_voucher_codes?: Record<string, string | null | undefined>;
  shipping_methods?: Record<string, string>;
}
