import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getShipmentForItem,
  updateShipmentForItem,
} from "./shipment.service";
import { UpdateShipmentInput } from "./shipment.types";

export const getShipment = async (
  req: AuthRequest<{ itemId: string }>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const shipment = await getShipmentForItem(req.userId, req.params.itemId);
    res.json({ shipment });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateShipment = async (
  req: AuthRequest<{ itemId: string }, {}, UpdateShipmentInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const shipment = await updateShipmentForItem(
      req.userId,
      req.params.itemId,
      req.body
    );
    res.json({ shipment });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
