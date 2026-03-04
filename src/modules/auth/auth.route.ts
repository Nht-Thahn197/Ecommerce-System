import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { login, logout, logoutAll, me, refresh, register } from "./auth.controller";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.get("/me", authMiddleware, me);

export default router;
