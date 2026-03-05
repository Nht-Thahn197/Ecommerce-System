import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  createDispute,
  createReturn,
  myReturns,
  pendingDisputes,
  pendingReturns,
  updateDispute,
  updateReturn,
} from "./return.controller";

const router = Router();

router.post("/", authMiddleware, createReturn);
router.get("/me", authMiddleware, myReturns);
router.get("/pending", authMiddleware, requireAdmin, pendingReturns);
router.get("/disputes", authMiddleware, requireAdmin, pendingDisputes);
router.post("/:id/dispute", authMiddleware, createDispute);
router.patch("/:id/dispute", authMiddleware, requireAdmin, updateDispute);
router.patch("/:id", authMiddleware, requireAdmin, updateReturn);

export default router;
