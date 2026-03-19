export interface ShopVouchersQuery {
  page?: string;
  limit?: string;
  q?: string;
  status?: string;
}

export interface ShopVoucherInput {
  code?: string;
  discount_type?: string;
  discount_value?: number | string;
  min_order_amount?: number | string;
  product_ids?: string[] | null;
  max_discount_amount?: number | string | null;
  starts_at?: string;
  ends_at?: string;
  quantity?: number | string;
  is_active?: boolean;
}
