import { Router } from "express";
import {
  authMiddleware,
  requireAdminAccess,
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
router.post("/", authMiddleware, requireAdminAccess, createCategoryHandler);
router.patch("/:id", authMiddleware, requireAdminAccess, updateCategoryHandler);
router.delete("/:id", authMiddleware, requireAdminAccess, deleteCategoryHandler);

export default router;
