import { NextFunction, Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  addReview,
  getReviews,
  getSummary,
  removeReview,
  uploadReviewMedia,
  updateMyReview,
} from "./review.controller";

const router = Router();
const uploadDir = path.join(process.cwd(), "public", "uploads", "reviews");

const parseUploadLimitMb = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const reviewMediaUploadMaxMb = parseUploadLimitMb(
  process.env.REVIEW_MEDIA_UPLOAD_MAX_MB,
  20
);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase() || ".jpg";
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm"];
    const safeExt = allowedExt.includes(rawExt) ? rawExt : ".jpg";
    const userId = (req as any).userId || "reviewer";
    const stamp = Date.now();
    const rand = Math.round(Math.random() * 1e9);
    cb(null, `${userId}-${stamp}-${rand}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: reviewMediaUploadMaxMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ].includes(file.mimetype);

    if (!ok) {
      (req as any).fileValidationError =
        "Chi ho tro JPG, PNG, WEBP, MP4, MOV hoac WEBM";
    }

    cb(null, ok);
  },
});

const reviewMediaUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload.fields([
    { name: "images", maxCount: 6 },
    { name: "video", maxCount: 1 },
  ])(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `Video danh gia khong duoc vuot qua ${reviewMediaUploadMaxMb}MB`,
        });
      }

      return res.status(400).json({
        message: error.message || "Khong the tai media danh gia",
      });
    }

    if (error) {
      return res.status(400).json({
        message: "Khong the tai media danh gia",
      });
    }

    next();
  });
};

router.get("/", getReviews);
router.get("/summary", getSummary);
router.post(
  "/media/upload",
  authMiddleware,
  reviewMediaUpload,
  uploadReviewMedia
);
router.post("/", authMiddleware, addReview);
router.patch("/:id", authMiddleware, updateMyReview);
router.delete("/:id", authMiddleware, requireAdmin, removeReview);

export default router;
