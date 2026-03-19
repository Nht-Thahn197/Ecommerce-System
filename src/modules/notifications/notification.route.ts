import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  getMyNotifications,
  readAllMyNotifications,
  readMyNotification,
} from "./notification.controller";

const router = Router();

router.get("/", authMiddleware, getMyNotifications);
router.patch("/read-all", authMiddleware, readAllMyNotifications);
router.patch("/:id/read", authMiddleware, readMyNotification);

export default router;
