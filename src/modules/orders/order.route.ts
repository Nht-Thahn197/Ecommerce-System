import { Router } from "express";
import { authMiddleware, requireAdmin, requireSeller } from "../../middleware/auth.middleware";
import {
  getMyOrder,
  getMyOrders,
  getSellerItems,
  updateOrderPayment,
  updateItemStatus,
} from "./order.controller";

const router = Router();

router.get("/", authMiddleware, getMyOrders);
router.get("/seller/items", authMiddleware, requireSeller, getSellerItems);
router.get("/:id", authMiddleware, getMyOrder);
router.patch("/items/:id/status", authMiddleware, updateItemStatus);
router.patch(
  "/:id/payment-status",
  authMiddleware,
  requireAdmin,
  updateOrderPayment
);

export default router;
