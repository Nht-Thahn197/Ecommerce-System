export interface ListProductsQuery {
  page?: string;
  limit?: string;
  q?: string;
  category_id?: string;
  include_descendants?: string;
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
  gtin?: string;
  condition?: string;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  cover_image_url?: string;
  video_url?: string;
  media_gallery?: string[];
  status?: string;
  shop_id?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category_id?: number;
  gtin?: string | null;
  condition?: string | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  cover_image_url?: string | null;
  video_url?: string | null;
  media_gallery?: string[] | null;
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
