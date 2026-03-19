import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  changeMyPassword,
  login,
  logout,
  logoutAll,
  me,
  refresh,
  register,
  uploadAvatar,
  updateMe,
} from "./auth.controller";

const router = Router();

const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png"].includes(rawExt) ? rawExt : ".jpg";
    const userId = (req as any).userId || "user";
    const stamp = Date.now();
    const rand = Math.round(Math.random() * 1e9);
    cb(null, `${userId}-${stamp}-${rand}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype);
    if (!ok) {
      ( _req as any ).fileValidationError = "Chỉ hỗ trợ JPG/PNG";
    }
    cb(null, ok);
  },
});

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.get("/me", authMiddleware, me);
router.patch("/me", authMiddleware, updateMe);
router.patch("/me/password", authMiddleware, changeMyPassword);
router.post(
  "/me/avatar",
  authMiddleware,
  upload.single("avatar"),
  uploadAvatar
);

export default router;
