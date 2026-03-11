import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import {
  authMiddleware,
  requireAdmin,
} from "../../middleware/auth.middleware";
import {
  listPending,
  listPublic,
  myShops,
  register,
  uploadAvatar,
  updateProfile,
  uploadDocument,
  updateStatus,
} from "./shop.controller";

const router = Router();

const documentUploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "shop-documents"
);

const avatarUploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "shop-avatars"
);

fs.mkdirSync(documentUploadDir, { recursive: true });
fs.mkdirSync(avatarUploadDir, { recursive: true });

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, documentUploadDir),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase() || ".jpg";
    const allowedExt = [".jpg", ".jpeg", ".png", ".pdf"];
    const safeExt = allowedExt.includes(rawExt) ? rawExt : ".jpg";
    const userId = (req as any).userId || "user";
    const stamp = Date.now();
    const rand = Math.round(Math.random() * 1e9);

    cb(null, `${userId}-${stamp}-${rand}${safeExt}`);
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ].includes(file.mimetype);

    if (!ok) {
      (_req as any).fileValidationError = "Chi ho tro JPG, PNG hoac PDF";
    }

    cb(null, ok);
  },
});

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarUploadDir),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png"].includes(rawExt) ? rawExt : ".jpg";
    const shopId = req.params.id || (req as any).userId || "shop";
    const stamp = Date.now();
    const rand = Math.round(Math.random() * 1e9);

    cb(null, `${shopId}-${stamp}-${rand}${safeExt}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype);

    if (!ok) {
      (_req as any).fileValidationError = "Chi ho tro JPG/PNG";
    }

    cb(null, ok);
  },
});

router.get("/", listPublic);
router.post("/register", authMiddleware, register);
router.post(
  "/documents/upload",
  authMiddleware,
  documentUpload.array("documents", 10),
  uploadDocument
);
router.get("/me", authMiddleware, myShops);
router.post("/:id/avatar", authMiddleware, avatarUpload.single("avatar"), uploadAvatar);
router.patch("/:id/profile", authMiddleware, updateProfile);
router.get("/pending", authMiddleware, requireAdmin, listPending);
router.patch(
  "/:id/status",
  authMiddleware,
  requireAdmin,
  updateStatus
);

export default router;
