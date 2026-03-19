import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createReview,
  deleteReviewByAdmin,
  getRatingSummary,
  listReviews,
  updateReview,
} from "./review.service";
import {
  CreateReviewInput,
  ListReviewsQuery,
  UpdateReviewInput,
} from "./review.types";

export const getReviews = async (
  req: AuthRequest<{}, {}, {}, ListReviewsQuery>,
  res: Response
) => {
  try {
    const reviews = await listReviews(req.query);
    res.json(reviews);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const uploadReviewMedia = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const validationError = (req as any).fileValidationError as
      | string
      | undefined;

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const files = ((req as any).files || {}) as Record<
      string,
      Express.Multer.File[]
    >;
    const images = files.images || [];
    const video = files.video || [];

    if (!images.length && !video.length) {
      return res.status(400).json({ message: "Khong co file media" });
    }

    res.json({
      media: {
        image_urls: images.map((file) => `/ui/uploads/reviews/${file.filename}`),
        video_urls: video.map((file) => `/ui/uploads/reviews/${file.filename}`),
      },
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const addReview = async (
  req: AuthRequest<{}, {}, CreateReviewInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const review = await createReview(req.userId, req.body);
    res.status(201).json({ review });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMyReview = async (
  req: AuthRequest<{ id: string }, {}, UpdateReviewInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const review = await updateReview(req.userId, req.params.id, req.body);
    res.json({ review });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const removeReview = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    await deleteReviewByAdmin(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getSummary = async (
  req: AuthRequest<{}, {}, {}, { product_id?: string }>,
  res: Response
) => {
  try {
    const summary = await getRatingSummary(req.query.product_id || "");
    res.json({ summary });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
