import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategories,
  getCategory,
  updateCategoryHandler,
} from "./category.controller";

const router = Router();

router.get("/", getCategories);
router.get("/:id", getCategory);
router.post("/", authMiddleware, requireAdmin, createCategoryHandler);
router.patch("/:id", authMiddleware, requireAdmin, updateCategoryHandler);
router.delete("/:id", authMiddleware, requireAdmin, deleteCategoryHandler);

export default router;

