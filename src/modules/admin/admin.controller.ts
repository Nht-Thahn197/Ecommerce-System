import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getOverview,
  getPendingShops,
  getRecentOrders,
} from "./admin.service";
import { RecentOrdersQuery } from "./admin.types";

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
