export interface ListProductsQuery {
  page?: string;
  limit?: string;
  q?: string;
  category_id?: string;
  shop_id?: string;
  status?: string;
  min_price?: string;
  max_price?: string;
}

export interface UpdateVariantStockInput {
  stock: number;
}
