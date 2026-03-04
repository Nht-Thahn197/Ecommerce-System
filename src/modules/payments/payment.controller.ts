import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { mockPayment } from "./payment.service";
import { MockPaymentInput } from "./payment.types";

export const mockPay = async (
  req: AuthRequest<{}, {}, MockPaymentInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const order = await mockPayment(req.userId, req.body);
    res.json({ order });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
