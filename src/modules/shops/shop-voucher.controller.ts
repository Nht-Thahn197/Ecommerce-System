import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createShopVoucher,
  deleteShopVoucher,
  getShopVoucherById,
  getShopVouchers,
  updateShopVoucher,
} from "./shop-voucher.service";
import { ShopVoucherInput, ShopVouchersQuery } from "./shop-voucher.types";

export const listShopVoucherHandler = async (
  req: AuthRequest<{ id: string }, {}, {}, ShopVouchersQuery>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const vouchers = await getShopVouchers(req.userId, req.params.id, req.query);
    res.json({ vouchers });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const shopVoucherDetailHandler = async (
  req: AuthRequest<{ id: string; voucherId: string }>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const voucher = await getShopVoucherById(
      req.userId,
      req.params.id,
      req.params.voucherId
    );
    res.json({ voucher });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createShopVoucherHandler = async (
  req: AuthRequest<{ id: string }, {}, ShopVoucherInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const voucher = await createShopVoucher(req.userId, req.params.id, req.body || {});
    res.status(201).json({ voucher });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateShopVoucherHandler = async (
  req: AuthRequest<{ id: string; voucherId: string }, {}, ShopVoucherInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const voucher = await updateShopVoucher(
      req.userId,
      req.params.id,
      req.params.voucherId,
      req.body || {}
    );
    res.json({ voucher });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteShopVoucherHandler = async (
  req: AuthRequest<{ id: string; voucherId: string }>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    await deleteShopVoucher(req.userId, req.params.id, req.params.voucherId);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
