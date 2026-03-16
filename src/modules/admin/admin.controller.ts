import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createAdminVoucher,
  deleteAdminVoucher,
  getOverview,
  getAdminProducts,
  getAdminVoucherById,
  getAdminVouchers,
  getPendingShops,
  getRecentOrders,
  getShopDetail,
  updateAdminVoucher,
  updateProductStatusByAdmin,
} from "./admin.service";
import {
  AdminProductsQuery,
  AdminVoucherInput,
  AdminVouchersQuery,
  RecentOrdersQuery,
  UpdateProductStatusInput,
} from "./admin.types";

export const overview = async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getOverview();
    res.json({ overview: data });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const recentOrders = async (
  req: AuthRequest<{}, {}, {}, RecentOrdersQuery>,
  res: Response
) => {
  try {
    const orders = await getRecentOrders(req.query);
    res.json({ orders });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const pendingShops = async (
  req: AuthRequest<{}, {}, {}, RecentOrdersQuery>,
  res: Response
) => {
  try {
    const shops = await getPendingShops(req.query);
    res.json({ shops });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const shopDetail = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    const shop = await getShopDetail(req.params.id);
    res.json({ shop });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const adminProducts = async (
  req: AuthRequest<{}, {}, {}, AdminProductsQuery>,
  res: Response
) => {
  try {
    const products = await getAdminProducts(req.query);
    res.json({ products });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProductStatus = async (
  req: AuthRequest<{ id: string }, {}, UpdateProductStatusInput>,
  res: Response
) => {
  try {
    const product = await updateProductStatusByAdmin(
      req.params.id,
      req.body?.status
    );
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const adminVouchers = async (
  req: AuthRequest<{}, {}, {}, AdminVouchersQuery>,
  res: Response
) => {
  try {
    const vouchers = await getAdminVouchers(req.query);
    res.json({ vouchers });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const adminVoucherDetail = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    const voucher = await getAdminVoucherById(req.params.id);
    res.json({ voucher });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createVoucher = async (
  req: AuthRequest<{}, {}, AdminVoucherInput>,
  res: Response
) => {
  try {
    const voucher = await createAdminVoucher(req.body || {});
    res.status(201).json({ voucher });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateVoucher = async (
  req: AuthRequest<{ id: string }, {}, AdminVoucherInput>,
  res: Response
) => {
  try {
    const voucher = await updateAdminVoucher(req.params.id, req.body || {});
    res.json({ voucher });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteVoucher = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    await deleteAdminVoucher(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
