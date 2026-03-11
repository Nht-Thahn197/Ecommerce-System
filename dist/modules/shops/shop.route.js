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
const shop_controller_1 = require("./shop.controller");
const router = (0, express_1.Router)();
const documentUploadDir = path_1.default.join(process.cwd(), "public", "uploads", "shop-documents");
const avatarUploadDir = path_1.default.join(process.cwd(), "public", "uploads", "shop-avatars");
fs_1.default.mkdirSync(documentUploadDir, { recursive: true });
fs_1.default.mkdirSync(avatarUploadDir, { recursive: true });
const documentStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, documentUploadDir),
    filename: (req, file, cb) => {
        const rawExt = path_1.default.extname(file.originalname).toLowerCase() || ".jpg";
        const allowedExt = [".jpg", ".jpeg", ".png", ".pdf"];
        const safeExt = allowedExt.includes(rawExt) ? rawExt : ".jpg";
        const userId = req.userId || "user";
        const stamp = Date.now();
        const rand = Math.round(Math.random() * 1e9);
        cb(null, `${userId}-${stamp}-${rand}${safeExt}`);
    },
});
const documentUpload = (0, multer_1.default)({
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
            _req.fileValidationError = "Chi ho tro JPG, PNG hoac PDF";
        }
        cb(null, ok);
    },
});
const avatarStorage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarUploadDir),
    filename: (req, file, cb) => {
        const rawExt = path_1.default.extname(file.originalname).toLowerCase() || ".jpg";
        const safeExt = [".jpg", ".jpeg", ".png"].includes(rawExt) ? rawExt : ".jpg";
        const shopId = req.params.id || req.userId || "shop";
        const stamp = Date.now();
        const rand = Math.round(Math.random() * 1e9);
        cb(null, `${shopId}-${stamp}-${rand}${safeExt}`);
    },
});
const avatarUpload = (0, multer_1.default)({
    storage: avatarStorage,
    limits: { fileSize: 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ok = ["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype);
        if (!ok) {
            _req.fileValidationError = "Chi ho tro JPG/PNG";
        }
        cb(null, ok);
    },
});
router.get("/", shop_controller_1.listPublic);
router.post("/register", auth_middleware_1.authMiddleware, shop_controller_1.register);
router.post("/documents/upload", auth_middleware_1.authMiddleware, documentUpload.array("documents", 10), shop_controller_1.uploadDocument);
router.get("/me", auth_middleware_1.authMiddleware, shop_controller_1.myShops);
router.post("/:id/avatar", auth_middleware_1.authMiddleware, avatarUpload.single("avatar"), shop_controller_1.uploadAvatar);
router.patch("/:id/profile", auth_middleware_1.authMiddleware, shop_controller_1.updateProfile);
router.get("/pending", auth_middleware_1.authMiddleware, auth_middleware_1.requireAdmin, shop_controller_1.listPending);
router.patch("/:id/status", auth_middleware_1.authMiddleware, auth_middleware_1.requireAdmin, shop_controller_1.updateStatus);
exports.default = router;
