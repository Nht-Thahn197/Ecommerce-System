import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
  requireAdminAccess,
} from "../../middleware/auth.middleware";
import {
  adminUserDetail,
  adminUsers,
  adminVoucherDetail,
  adminVouchers,
  overview,
  adminProducts,
  createVoucher,
  deleteVoucher,
  pendingShops,
  recentOrders,
  shopRevenueManagement,
  shopDetail,
  updateAdminUser,
  updateWithdrawRequest,
  updateVoucher,
  updateProductStatus,
} from "./admin.controller";

const router = Router();

router.use(authMiddleware, requireAdminAccess);

router.get("/overview", overview);
router.get("/orders/recent", recentOrders);
router.get("/users", adminUsers);
router.get("/users/:id", adminUserDetail);
router.patch("/users/:id", requireAdmin, updateAdminUser);
router.get("/shops/pending", pendingShops);
router.get("/shops/revenue/withdraw-requests", shopRevenueManagement);
router.patch("/shops/revenue/withdraw-requests/:id", updateWithdrawRequest);
router.get("/shops/:id", shopDetail);
router.get("/products", adminProducts);
router.patch("/products/:id/status", updateProductStatus);
router.get("/vouchers", adminVouchers);
router.get("/vouchers/:id", adminVoucherDetail);
router.post("/vouchers", createVoucher);
router.patch("/vouchers/:id", updateVoucher);
router.delete("/vouchers/:id", deleteVoucher);

export default router;
