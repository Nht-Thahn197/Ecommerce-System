"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const product_controller_1 = require("./product.controller");
const router = (0, express_1.Router)();
const uploadDir = path_1.default.join(process.cwd(), "public", "uploads", "products");
fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const rawExt = path_1.default.extname(file.originalname).toLowerCase() || ".jpg";
        const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".webm"];
        const safeExt = allowedExt.includes(rawExt) ? rawExt : ".jpg";
        const userId = req.userId || "seller";
        const stamp = Date.now();
        const rand = Math.round(Math.random() * 1e9);
        cb(null, `${userId}-${stamp}-${rand}${safeExt}`);
    },
});
const upload = (0, multer_1.default)({
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
            req.fileValidationError =
                "Chi ho tro JPG, PNG, WEBP, MP4, MOV hoac WEBM";
        }
        cb(null, ok);
    },
});
router.get("/", product_controller_1.getProducts);
router.post("/media/upload", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, upload.fields([
    { name: "gallery", maxCount: 9 },
    { name: "cover", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), product_controller_1.uploadProductMedia);
router.post("/", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, product_controller_1.createProductHandler);
router.patch("/:id", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, product_controller_1.updateProductHandler);
router.delete("/:id", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, product_controller_1.deleteProductHandler);
router.post("/:id/variants", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, product_controller_1.createVariantHandler);
router.patch("/variants/:id/stock", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, product_controller_1.updateStock);
router.patch("/variants/:id", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, product_controller_1.updateVariantHandler);
router.delete("/variants/:id", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, product_controller_1.deleteVariantHandler);
router.get("/:id", product_controller_1.getProduct);
exports.default = router;
