"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSeller = exports.requireCustomer = exports.requireAdmin = exports.requireRole = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../libs/prisma"));
const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header)
        return res.status(401).json({ message: "No token" });
    const parts = header.split(" ");
    const token = parts.length === 2 ? parts[1] : parts[0];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ message: "JWT secret is not set" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    }
    catch {
        res.status(401).json({ message: "Invalid token" });
    }
};
exports.authMiddleware = authMiddleware;
const requireRole = (...roles) => (req, res, next) => {
    if (!req.userRole) {
        return res.status(403).json({ message: "Forbidden" });
    }
    if (!roles.includes(req.userRole)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)("admin");
exports.requireCustomer = (0, exports.requireRole)("customer", "admin");
const requireSeller = async (req, res, next) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const shop = await prisma_1.default.shops.findFirst({
            where: { owner_id: req.userId, status: "approved" },
            select: { id: true, status: true },
        });
        if (!shop) {
            return res.status(403).json({ message: "Seller only" });
        }
        next();
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
};
exports.requireSeller = requireSeller;
