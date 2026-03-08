import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { authMiddleware, requireSeller } from "../../middleware/auth.middleware";
import {
  createProductHandler,
  createVariantHandler,
  deleteProductHandler,
  deleteVariantHandler,
  getProduct,
  getProducts,
  uploadProductMedia,
  updateProductHandler,
  updateStock,
  updateVariantHandler,
} from "./product.controller";

const router = Router();
const uploadDir = path.join(process.cwd(), "public", "uploads", "products");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname).toLowerCase() || ".jpg";
    const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm"];
    const safeExt = allowedExt.includes(rawExt) ? rawExt : ".jpg";
    const userId = (req as any).userId || "seller";
    const stamp = Date.now();
    const rand = Math.round(Math.random() * 1e9);
    cb(null, `${userId}-${stamp}-${rand}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ].includes(file.mimetype);

    if (!ok) {
      (req as any).fileValidationError =
        "Chi ho tro JPG, PNG, WEBP, MP4, MOV hoac WEBM";
    }

    cb(null, ok);
  },
});

router.get("/", getProducts);
router.post(
  "/media/upload",
  authMiddleware,
  requireSeller,
  upload.fields([
    { name: "gallery", maxCount: 9 },
    { name: "cover", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  uploadProductMedia
);
router.post("/", authMiddleware, requireSeller, createProductHandler);
router.patch("/:id", authMiddleware, requireSeller, updateProductHandler);
router.delete("/:id", authMiddleware, requireSeller, deleteProductHandler);
router.post("/:id/variants", authMiddleware, requireSeller, createVariantHandler);
router.patch(
  "/variants/:id/stock",
  authMiddleware,
  requireSeller,
  updateStock
);
router.patch("/variants/:id", authMiddleware, requireSeller, updateVariantHandler);
router.delete("/variants/:id", authMiddleware, requireSeller, deleteVariantHandler);
router.get("/:id", getProduct);

export default router;
