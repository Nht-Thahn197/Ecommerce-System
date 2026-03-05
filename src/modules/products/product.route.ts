import { Router } from "express";
import { authMiddleware, requireSeller } from "../../middleware/auth.middleware";
import {
  createProductHandler,
  createVariantHandler,
  deleteProductHandler,
  deleteVariantHandler,
  getProduct,
  getProducts,
  updateProductHandler,
  updateStock,
  updateVariantHandler,
} from "./product.controller";

const router = Router();

router.get("/", getProducts);
router.post("/", authMiddleware, requireSeller, createProductHandler);
router.patch("/:id", authMiddleware, requireSeller, updateProductHandler);
router.delete("/:id", authMiddleware, requireSeller, deleteProductHandler);
router.post("/:id/variants", authMiddleware, requireSeller, createVariantHandler);
router.patch(
  "/variants/:id/stock",
  authMiddleware,
  requireSeller,
  updateStock
);
router.patch("/variants/:id", authMiddleware, requireSeller, updateVariantHandler);
router.delete("/variants/:id", authMiddleware, requireSeller, deleteVariantHandler);
router.get("/:id", getProduct);

export default router;
