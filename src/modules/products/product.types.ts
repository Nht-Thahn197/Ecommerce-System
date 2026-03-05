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

export interface CreateProductInput {
  name: string;
  description?: string;
  category_id?: number;
  status?: string;
  shop_id?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category_id?: number;
  status?: string;
}

export interface CreateVariantInput {
  sku?: string;
  price: number;
  stock?: number;
  weight?: number;
}

export interface UpdateVariantInput {
  sku?: string;
  price?: number;
  stock?: number;
  weight?: number;
}
