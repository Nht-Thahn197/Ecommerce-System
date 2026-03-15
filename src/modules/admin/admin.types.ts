export interface RecentOrdersQuery {
  limit?: string;
  page?: string;
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
