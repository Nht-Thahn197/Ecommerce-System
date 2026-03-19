import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import {
  CreateReviewInput,
  ListReviewsQuery,
  UpdateReviewInput,
} from "./review.types";

const MAX_LIMIT = 100;
const MAX_IMAGE_COUNT = 6;
const MAX_VIDEO_COUNT = 1;
const MAX_MEDIA_URL_LENGTH = 500;
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const REVIEW_MEDIA_UNAVAILABLE_MESSAGE =
  "Tính năng ảnh/video đánh giá chưa sẵn sàng. Vui lòng cập nhật migration mới rồi thử lại.";

const baseReviewSelect = {
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
} satisfies Prisma.reviewsSelect;

const reviewSelectWithMedia = {
  ...baseReviewSelect,
  image_urls: true,
  video_urls: true,
  has_media: true,
} satisfies Prisma.reviewsSelect;

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseBoolean = (value?: string) =>
  TRUE_VALUES.has((value || "").trim().toLowerCase());

const normalizeRating = (value: number) => {
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    throw new Error("rating must be between 1 and 5");
  }

  return Math.floor(value);
};

const parseRatingFilter = (value?: string) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return normalizeRating(Number(value));
};

const normalizeComment = (value?: string) => {
  if (value === undefined) return undefined;
  const trimmed = String(value || "").trim();
  return trimmed.length ? trimmed : null;
};

const normalizeMediaUrls = (
  value: string[] | undefined,
  maxCount: number,
  field: string
) => {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }

  const urls = Array.from(
    new Set(
      value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );

  if (urls.length > maxCount) {
    throw new Error(`${field} supports up to ${maxCount} file(s)`);
  }

  urls.forEach((url) => {
    if (url.length > MAX_MEDIA_URL_LENGTH) {
      throw new Error(`${field} contains an invalid url`);
    }
  });

  return urls;
};

const toJsonField = (value: string[]) =>
  value.length ? (value as Prisma.InputJsonValue) : Prisma.DbNull;

const toStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

const detectReviewMediaSchema = async () => {
  try {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'reviews'
        AND column_name IN ('image_urls', 'video_urls', 'has_media')
    `;

    const columns = new Set(
      rows.map((row) => String(row?.column_name || "").trim())
    );

    return (
      columns.has("image_urls") &&
      columns.has("video_urls") &&
      columns.has("has_media")
    );
  } catch {
    return false;
  }
};

const serializeReview = (review: any, mediaSupported: boolean) => ({
  ...review,
  image_urls: mediaSupported ? toStringArray(review?.image_urls) : [],
  video_urls: mediaSupported ? toStringArray(review?.video_urls) : [],
  has_media: mediaSupported ? Boolean(review?.has_media) : false,
});

const getReviewSummary = async (productId: string, mediaSupported: boolean) => {
  const where: Prisma.reviewsWhereInput = { product_id: productId };

  const [total, stats, ratingGroups, withCommentCount, withMediaCount] =
    await Promise.all([
      prisma.reviews.count({ where }),
      prisma.reviews.aggregate({
        where,
        _avg: { rating: true },
      }),
      prisma.reviews.groupBy({
        by: ["rating"],
        where,
        _count: { rating: true },
      }),
      prisma.reviews.count({
        where: {
          ...where,
          comment: { not: null },
        },
      }),
      mediaSupported
        ? prisma.reviews.count({
            where: {
              ...where,
              has_media: true,
            },
          })
        : Promise.resolve(0),
    ]);

  const ratingCounts: Record<string, number> = {
    "5": 0,
    "4": 0,
    "3": 0,
    "2": 0,
    "1": 0,
  };

  ratingGroups.forEach((group) => {
    if (
      typeof group.rating !== "number" ||
      !(String(group.rating) in ratingCounts)
    ) {
      return;
    }

    ratingCounts[String(group.rating)] = Number(group._count.rating || 0);
  });

  return {
    total_reviews: total,
    average_rating: Number(stats._avg.rating ?? 0),
    rating_counts: ratingCounts,
    with_comment_count: withCommentCount,
    with_media_count: withMediaCount,
  };
};

const buildReviewFilters = (
  query: ListReviewsQuery,
  mediaSupported: boolean
) => {
  const where: Prisma.reviewsWhereInput = {
    product_id: query.product_id,
  };

  const rating = parseRatingFilter(query.rating);
  if (rating !== undefined) {
    where.rating = rating;
  }

  if (parseBoolean(query.has_comment)) {
    where.comment = { not: null };
  }

  if (mediaSupported && parseBoolean(query.has_media)) {
    where.has_media = true;
  }

  return where;
};

export const listReviews = async (query: ListReviewsQuery) => {
  if (!query.product_id) {
    throw new Error("product_id is required");
  }

  const mediaSupported = await detectReviewMediaSchema();
  const page = Math.max(1, toNumber(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(query.limit) || 20));
  const summary = await getReviewSummary(query.product_id, mediaSupported);
  const requestedMediaOnly = parseBoolean(query.has_media);

  if (requestedMediaOnly && !mediaSupported) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        total_pages: 0,
      },
      summary: {
        ...summary,
        filtered_total: 0,
      },
    };
  }

  const skip = (page - 1) * limit;
  const where = buildReviewFilters(query, mediaSupported);
  const select = mediaSupported ? reviewSelectWithMedia : baseReviewSelect;
  const [total, items] = await Promise.all([
    prisma.reviews.count({ where }),
    prisma.reviews.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select,
    }),
  ]);

  return {
    data: items.map((item) => serializeReview(item, mediaSupported)),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    summary: {
      ...summary,
      filtered_total: total,
    },
  };
};

export const getRatingSummary = async (productId: string) => {
  if (!productId) {
    throw new Error("product_id is required");
  }

  const mediaSupported = await detectReviewMediaSchema();

  return {
    product_id: productId,
    ...(await getReviewSummary(productId, mediaSupported)),
  };
};

export const createReview = async (userId: string, input: CreateReviewInput) => {
  if (!input.product_id) {
    throw new Error("product_id is required");
  }

  const mediaSupported = await detectReviewMediaSchema();
  const rating = normalizeRating(input.rating);
  const imageUrls =
    normalizeMediaUrls(input.image_urls, MAX_IMAGE_COUNT, "image_urls") || [];
  const videoUrls =
    normalizeMediaUrls(input.video_urls, MAX_VIDEO_COUNT, "video_urls") || [];

  if (!mediaSupported && (imageUrls.length || videoUrls.length)) {
    throw new Error(REVIEW_MEDIA_UNAVAILABLE_MESSAGE);
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

  const select = mediaSupported ? reviewSelectWithMedia : baseReviewSelect;
  const existing = await prisma.reviews.findFirst({
    where: { product_id: input.product_id, user_id: userId },
    select,
  });

  if (existing) {
    return serializeReview(existing, mediaSupported);
  }

  const comment = normalizeComment(input.comment) ?? null;
  const data: Prisma.reviewsCreateInput = {
    rating,
    comment,
    products: { connect: { id: input.product_id } },
    users: { connect: { id: userId } },
  };

  if (mediaSupported) {
    data.image_urls = toJsonField(imageUrls);
    data.video_urls = toJsonField(videoUrls);
    data.has_media = imageUrls.length > 0 || videoUrls.length > 0;
  }

  const review = await prisma.reviews.create({
    data,
    select,
  });

  return serializeReview(review, mediaSupported);
};

export const updateReview = async (
  userId: string,
  reviewId: string,
  input: UpdateReviewInput
) => {
  const mediaSupported = await detectReviewMediaSchema();

  const review = await prisma.reviews.findUnique({
    where: { id: reviewId },
    select: mediaSupported
      ? {
          id: true,
          user_id: true,
          image_urls: true,
          video_urls: true,
        }
      : {
          id: true,
          user_id: true,
        },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  if (review.user_id !== userId) {
    throw new Error("Unauthorized");
  }

  const data: Prisma.reviewsUpdateInput = {};

  if (input.rating !== undefined) {
    data.rating = normalizeRating(input.rating);
  }

  if (input.comment !== undefined) {
    data.comment = normalizeComment(input.comment);
  }

  const imageUrls =
    normalizeMediaUrls(input.image_urls, MAX_IMAGE_COUNT, "image_urls");
  const videoUrls =
    normalizeMediaUrls(input.video_urls, MAX_VIDEO_COUNT, "video_urls");

  if (!mediaSupported && ((imageUrls?.length || 0) > 0 || (videoUrls?.length || 0) > 0)) {
    throw new Error(REVIEW_MEDIA_UNAVAILABLE_MESSAGE);
  }

  if (mediaSupported) {
    const currentImageUrls = toStringArray((review as any).image_urls);
    const currentVideoUrls = toStringArray((review as any).video_urls);
    const nextImageUrls = imageUrls ?? currentImageUrls;
    const nextVideoUrls = videoUrls ?? currentVideoUrls;

    if (input.image_urls !== undefined) {
      data.image_urls = toJsonField(nextImageUrls);
    }

    if (input.video_urls !== undefined) {
      data.video_urls = toJsonField(nextVideoUrls);
    }

    if (input.image_urls !== undefined || input.video_urls !== undefined) {
      data.has_media = nextImageUrls.length > 0 || nextVideoUrls.length > 0;
    }
  }

  const updated = await prisma.reviews.update({
    where: { id: reviewId },
    data,
    select: mediaSupported ? reviewSelectWithMedia : baseReviewSelect,
  });

  return serializeReview(updated, mediaSupported);
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
