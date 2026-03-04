import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "./cart.service";
import { AddCartItemInput, UpdateCartItemInput } from "./cart.types";

export const getMyCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const cart = await getCart(req.userId);
    res.json(cart);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const addItem = async (
  req: AuthRequest<{}, {}, AddCartItemInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const item = await addCartItem(req.userId, req.body);
    res.status(201).json({ item });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateItem = async (
  req: AuthRequest<{ id: string }, {}, UpdateCartItemInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const item = await updateCartItem(req.userId, req.params.id, req.body);
    res.json({ item });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const removeItem = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    await removeCartItem(req.userId, req.params.id);
    res.json({ message: "Removed" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const clearMyCart = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    await clearCart(req.userId);
    res.json({ message: "Cleared" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
