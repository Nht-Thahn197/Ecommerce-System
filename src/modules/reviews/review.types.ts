export interface CreateReviewInput {
  product_id: string;
  rating: number;
  comment?: string;
  image_urls?: string[];
  video_urls?: string[];
}

export interface ListReviewsQuery {
  product_id?: string;
  page?: string;
  limit?: string;
  rating?: string;
  has_comment?: string;
  has_media?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  comment?: string;
  image_urls?: string[];
  video_urls?: string[];
}
