import { Router } from "express";
import { authMiddleware, requireAdmin, requireSeller } from "../../middleware/auth.middleware";
import {
  getSellerWallet,
  getMyOrder,
  getMyOrders,
  getSellerItems,
  postSellerWithdrawal,
  updateOrderPayment,
  updateItemStatus,
} from "./order.controller";

const router = Router();

router.get("/", authMiddleware, getMyOrders);
router.get("/seller/items", authMiddleware, requireSeller, getSellerItems);
router.get("/seller/wallet", authMiddleware, requireSeller, getSellerWallet);
router.post(
  "/seller/wallet/withdraw",
  authMiddleware,
  requireSeller,
  postSellerWithdrawal
);
router.get("/:id", authMiddleware, getMyOrder);
router.patch("/items/:id/status", authMiddleware, updateItemStatus);
router.patch(
  "/:id/payment-status",
  authMiddleware,
  requireAdmin,
  updateOrderPayment
);

export default router;
