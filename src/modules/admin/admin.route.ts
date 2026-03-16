import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  adminVoucherDetail,
  adminVouchers,
  overview,
  adminProducts,
  createVoucher,
  deleteVoucher,
  pendingShops,
  recentOrders,
  shopDetail,
  updateVoucher,
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
router.get("/vouchers", adminVouchers);
router.get("/vouchers/:id", adminVoucherDetail);
router.post("/vouchers", createVoucher);
router.patch("/vouchers/:id", updateVoucher);
router.delete("/vouchers/:id", deleteVoucher);

export default router;
