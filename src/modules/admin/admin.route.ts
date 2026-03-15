import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  overview,
  adminProducts,
  pendingShops,
  recentOrders,
  shopDetail,
  updateProductStatus,
} from "./admin.controller";

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get("/overview", overview);
router.get("/orders/recent", recentOrders);
router.get("/shops/pending", pendingShops);
router.get("/shops/:id", shopDetail);
router.get("/products", adminProducts);
router.patch("/products/:id/status", updateProductStatus);

export default router;
