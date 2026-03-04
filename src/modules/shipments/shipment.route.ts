import { Router } from "express";
import { authMiddleware, requireSeller } from "../../middleware/auth.middleware";
import { getShipment, updateShipment } from "./shipment.controller";

const router = Router();

router.get("/items/:itemId", authMiddleware, getShipment);
router.patch("/items/:itemId", authMiddleware, requireSeller, updateShipment);

export default router;
