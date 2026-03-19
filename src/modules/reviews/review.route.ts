import { Router } from "express";
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
  limits: { fileSize: 20 * 1024 * 1024 },
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

router.get("/", getReviews);
router.get("/summary", getSummary);
router.post(
  "/media/upload",
  authMiddleware,
  upload.fields([
    { name: "images", maxCount: 6 },
    { name: "video", maxCount: 1 },
  ]),
  uploadReviewMedia
);
router.post("/", authMiddleware, addReview);
router.patch("/:id", authMiddleware, updateMyReview);
router.delete("/:id", authMiddleware, requireAdmin, removeReview);

export default router;
