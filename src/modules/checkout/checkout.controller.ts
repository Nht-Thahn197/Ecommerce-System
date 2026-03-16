import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { checkoutCart, previewCheckout } from "./checkout.service";
import { CheckoutInput } from "./checkout.types";

export const checkoutPreview = async (
  req: AuthRequest<{}, {}, CheckoutInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await previewCheckout(req.userId, req.body || {});
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const checkout = async (
  req: AuthRequest<{}, {}, CheckoutInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await checkoutCart(req.userId, req.body || {});
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
