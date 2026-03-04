export interface AddCartItemInput {
  product_variant_id: string;
  quantity?: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}
