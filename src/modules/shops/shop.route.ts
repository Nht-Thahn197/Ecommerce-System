import { Router } from "express";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  listPending,
  listPublic,
  myShops,
  register,
  updateStatus,
} from "./shop.controller";

const router = Router();

router.get("/", listPublic);
router.post("/register", authMiddleware, register);
router.get("/me", authMiddleware, myShops);
router.get("/pending", authMiddleware, requireAdmin, listPending);
router.patch(
  "/:id/status",
  authMiddleware,
  requireAdmin,
  updateStatus
);

export default router;
