import { Router } from "express";
import {
  authMiddleware,
  requireAdminAccess,
} from "../../middleware/auth.middleware";
import { getUsers } from "./user.controller";

const router = Router();

router.get("/", authMiddleware, requireAdminAccess, getUsers);

export default router;
