import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  addReview,
  getReviews,
  getSummary,
  removeReview,
  updateMyReview,
} from "./review.controller";

const router = Router();

router.get("/", getReviews);
router.get("/summary", getSummary);
router.post("/", authMiddleware, addReview);
router.patch("/:id", authMiddleware, updateMyReview);
router.delete("/:id", authMiddleware, requireAdmin, removeReview);

export default router;
