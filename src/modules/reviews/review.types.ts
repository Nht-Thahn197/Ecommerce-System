export interface CreateReviewInput {
  product_id: string;
  rating: number;
  comment?: string;
}

export interface ListReviewsQuery {
  product_id?: string;
  page?: string;
  limit?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}
