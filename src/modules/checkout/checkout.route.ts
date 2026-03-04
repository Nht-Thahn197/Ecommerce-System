import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { checkout } from "./checkout.controller";

const router = Router();

router.post("/", authMiddleware, checkout);

export default router;
