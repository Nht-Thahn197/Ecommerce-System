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
  updateProfile,
  uploadDocument,
  updateStatus,
} from "./shop.controller";

const router = Router();

const uploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "shop-documents"
);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
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

const upload = multer({
  storage,
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

router.get("/", listPublic);
router.post("/register", authMiddleware, register);
router.post(
  "/documents/upload",
  authMiddleware,
  upload.array("documents", 10),
  uploadDocument
);
router.get("/me", authMiddleware, myShops);
router.patch("/:id/profile", authMiddleware, updateProfile);
router.get("/pending", authMiddleware, requireAdmin, listPending);
router.patch(
  "/:id/status",
  authMiddleware,
  requireAdmin,
  updateStatus
);

export default router;
