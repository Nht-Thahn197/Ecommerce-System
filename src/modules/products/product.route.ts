import { NextFunction, Request, Response, Router } from "express";
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
  syncVariantsHandler,
  uploadProductMedia,
  updateProductHandler,
  updateStock,
  updateVariantHandler,
} from "./product.controller";

const router = Router();
const uploadDir = path.join(process.cwd(), "public", "uploads", "products");

const parseUploadLimitMb = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const productMediaUploadMaxMb = parseUploadLimitMb(
  process.env.PRODUCT_MEDIA_UPLOAD_MAX_MB,
  100
);

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
  limits: { fileSize: productMediaUploadMaxMb * 1024 * 1024 },
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
        "Chỉ hỗ trợ JPG, PNG, WEBP, MP4, MOV hoac WEBM";
    }

    cb(null, ok);
  },
});

const productMediaUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  upload.fields([
    { name: "gallery", maxCount: 9 },
    { name: "cover", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ])(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: `Mỗi file media tối đa ${productMediaUploadMaxMb}MB`,
        });
      }

      return res.status(400).json({
        message: error.message || "Không thể tải media sản phẩm",
      });
    }

    if (error) {
      return res.status(400).json({
        message: "Không thể tải media sản phẩm",
      });
    }

    next();
  });
};

router.get("/", getProducts);
router.post(
  "/media/upload",
  authMiddleware,
  requireSeller,
  productMediaUpload,
  uploadProductMedia
);
router.post("/", authMiddleware, requireSeller, createProductHandler);
router.patch("/:id", authMiddleware, requireSeller, updateProductHandler);
router.delete("/:id", authMiddleware, requireSeller, deleteProductHandler);
router.post("/:id/variants", authMiddleware, requireSeller, createVariantHandler);
router.put("/:id/variants", authMiddleware, requireSeller, syncVariantsHandler);
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
