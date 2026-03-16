import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkout, checkoutPreview } from "./checkout.controller";

const router = Router();

router.post("/preview", authMiddleware, checkoutPreview);
router.post("/", authMiddleware, checkout);

export default router;
