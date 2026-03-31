import { Router } from "express";
import {
  authMiddleware,
  requireAdminAccess,
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
router.get("/pending", authMiddleware, requireAdminAccess, pendingReturns);
router.get("/disputes", authMiddleware, requireAdminAccess, pendingDisputes);
router.post("/:id/dispute", authMiddleware, createDispute);
router.patch("/:id/dispute", authMiddleware, requireAdminAccess, updateDispute);
router.patch("/:id", authMiddleware, requireAdminAccess, updateReturn);

export default router;
