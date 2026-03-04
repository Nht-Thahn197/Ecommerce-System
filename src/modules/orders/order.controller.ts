import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getOrderForUser,
  listOrderItemsForSeller,
  listOrdersForUser,
  updatePaymentStatus,
  updateOrderItemStatus,
} from "./order.service";
import {
  ListOrdersQuery,
  ListSellerItemsQuery,
  UpdateOrderItemStatusInput,
  UpdatePaymentStatusInput,
} from "./order.types";

export const getMyOrders = async (
  req: AuthRequest<{}, {}, {}, ListOrdersQuery>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const orders = await listOrdersForUser(req.userId, req.query);
    res.json({ orders });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMyOrder = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const order = await getOrderForUser(req.userId, req.params.id);
    res.json({ order });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const getSellerItems = async (
  req: AuthRequest<{}, {}, {}, ListSellerItemsQuery>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const items = await listOrderItemsForSeller(req.userId, req.query);
    res.json({ items });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateItemStatus = async (
  req: AuthRequest<{ id: string }, {}, UpdateOrderItemStatusInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await updateOrderItemStatus(
      req.userId,
      req.params.id,
      req.body.status
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateOrderPayment = async (
  req: AuthRequest<{ id: string }, {}, UpdatePaymentStatusInput>,
  res: Response
) => {
  try {
    const order = await updatePaymentStatus(
      req.params.id,
      req.body.payment_status
    );
    res.json({ order });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
