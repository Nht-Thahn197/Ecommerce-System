import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  overview,
  pendingShops,
  recentOrders,
  shopDetail,
} from "./admin.controller";

const router = Router();

router.use(authMiddleware, requireAdmin);

router.get("/overview", overview);
router.get("/orders/recent", recentOrders);
router.get("/shops/pending", pendingShops);
router.get("/shops/:id", shopDetail);

export default router;
