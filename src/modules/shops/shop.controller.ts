import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getMyShops,
  listApprovedShops,
  listPendingShops,
  registerShop,
  updateShopStatus,
} from "./shop.service";
import {
  ListShopsQuery,
  RegisterShopInput,
  UpdateShopStatusInput,
} from "./shop.types";

export const register = async (
  req: AuthRequest<{}, {}, RegisterShopInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const shop = await registerShop(req.userId, req.body);
    res.status(201).json({ shop });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const myShops = async (
  req: AuthRequest<{}, {}, {}, ListShopsQuery>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const shops = await getMyShops(req.userId, req.query);
    res.json({ shops });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listPublic = async (
  req: AuthRequest<{}, {}, {}, ListShopsQuery>,
  res: Response
) => {
  try {
    const shops = await listApprovedShops(req.query);
    res.json({ shops });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const listPending = async (
  req: AuthRequest<{}, {}, {}, ListShopsQuery>,
  res: Response
) => {
  try {
    const shops = await listPendingShops(req.query);
    res.json({ shops });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateStatus = async (
  req: AuthRequest<{ id: string }, {}, UpdateShopStatusInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const shop = await updateShopStatus(req.userId, req.params.id, req.body);
    res.json({ shop });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
