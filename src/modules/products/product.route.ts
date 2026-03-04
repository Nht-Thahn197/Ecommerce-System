import { Router } from "express";
import { authMiddleware, requireSeller } from "../../middleware/auth.middleware";
import { getProduct, getProducts, updateStock } from "./product.controller";

const router = Router();

router.get("/", getProducts);
router.get("/:id", getProduct);
router.patch(
  "/variants/:id/stock",
  authMiddleware,
  requireSeller,
  updateStock
);

export default router;
