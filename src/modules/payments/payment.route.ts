import { Router } from "express";
import { authMiddleware, requireCustomer } from "../../middleware/auth.middleware";
import { mockPay } from "./payment.controller";

const router = Router();

router.post("/mock", authMiddleware, requireCustomer, mockPay);

export default router;
