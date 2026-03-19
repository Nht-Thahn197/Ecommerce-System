export interface RecentOrdersQuery {
  limit?: string;
  page?: string;
}

export interface AdminShopRevenueQuery {
  limit?: string;
  page?: string;
}

export interface UpdateWithdrawRequestInput {
  action?: string;
}

export interface AdminProductsQuery {
  limit?: string;
  page?: string;
  q?: string;
  status?: string;
  shop_id?: string;
}

export interface UpdateProductStatusInput {
  status?: string;
}

export interface AdminVouchersQuery {
  limit?: string;
  page?: string;
  q?: string;
  status?: string;
}

export interface AdminVoucherInput {
  code?: string;
  voucher_kind?: string;
  discount_type?: string;
  discount_value?: number | string;
  min_order_amount?: number | string;
  category_id?: number | string | null;
  max_discount_amount?: number | string | null;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
}
