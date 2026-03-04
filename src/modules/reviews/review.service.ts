import prisma from "../../libs/prisma";
import {
  CreateReviewInput,
  ListReviewsQuery,
  UpdateReviewInput,
} from "./review.types";

const MAX_LIMIT = 100;

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

export const listReviews = async (query: ListReviewsQuery) => {
  if (!query.product_id) {
    throw new Error("product_id is required");
  }

  const page = Math.max(1, toNumber(query.page) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, toNumber(query.limit) || 20)
  );
  const skip = (page - 1) * limit;

  const where = { product_id: query.product_id };

  const [total, stats, items] = await Promise.all([
    prisma.reviews.count({ where }),
    prisma.reviews.aggregate({
      where,
      _avg: { rating: true },
    }),
    prisma.reviews.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        rating: true,
        comment: true,
        created_at: true,
        users: {
          select: {
            id: true,
            full_name: true,
          },
        },
      },
    }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    summary: {
      total_reviews: total,
      average_rating: stats._avg.rating ?? 0,
    },
  };
};

export const getRatingSummary = async (productId: string) => {
  if (!productId) {
    throw new Error("product_id is required");
  }

  const [total, stats] = await Promise.all([
    prisma.reviews.count({ where: { product_id: productId } }),
    prisma.reviews.aggregate({
      where: { product_id: productId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  return {
    product_id: productId,
    total_reviews: total,
    average_rating: stats._avg.rating ?? 0,
  };
};

export const createReview = async (userId: string, input: CreateReviewInput) => {
  if (!input.product_id) {
    throw new Error("product_id is required");
  }

  if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("rating must be between 1 and 5");
  }

  const product = await prisma.products.findUnique({
    where: { id: input.product_id },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const purchased = await prisma.order_items.findFirst({
    where: {
      status: "received",
      orders: { user_id: userId },
      product_variants: { products: { id: input.product_id } },
    },
    select: { id: true },
  });

  if (!purchased) {
    throw new Error("Only buyers can review this product");
  }

  const existing = await prisma.reviews.findFirst({
    where: { product_id: input.product_id, user_id: userId },
    select: { id: true },
  });

  if (existing) {
    throw new Error("You already reviewed this product");
  }

  const comment = input.comment?.trim();

  const review = await prisma.reviews.create({
    data: {
      product_id: input.product_id,
      user_id: userId,
      rating: Math.floor(input.rating),
      comment: comment || null,
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      created_at: true,
      users: { select: { id: true, full_name: true } },
    },
  });

  return review;
};

export const updateReview = async (
  userId: string,
  reviewId: string,
  input: UpdateReviewInput
) => {
  const review = await prisma.reviews.findUnique({
    where: { id: reviewId },
    select: { id: true, user_id: true },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.user_id !== userId) {
    throw new Error("Unauthorized");
  }

  const data: { rating?: number; comment?: string | null } = {};

  if (input.rating !== undefined) {
    if (
      !Number.isFinite(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    ) {
      throw new Error("rating must be between 1 and 5");
    }
    data.rating = Math.floor(input.rating);
  }

  if (input.comment !== undefined) {
    const comment = input.comment.trim();
    data.comment = comment.length ? comment : null;
  }

  const updated = await prisma.reviews.update({
    where: { id: reviewId },
    data,
    select: {
      id: true,
      rating: true,
      comment: true,
      created_at: true,
      users: { select: { id: true, full_name: true } },
    },
  });

  return updated;
};

export const deleteReviewByAdmin = async (reviewId: string) => {
  const existing = await prisma.reviews.findUnique({
    where: { id: reviewId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Review not found");
  }

  await prisma.reviews.delete({
    where: { id: reviewId },
  });
};
