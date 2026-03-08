"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchAll = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const MAX_LIMIT = 50;
const toNumber = (value) => {
    if (!value)
        return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
};
const searchAll = async (query) => {
    const q = query.q?.trim();
    if (!q) {
        throw new Error("q is required");
    }
    const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(query.limit) || 10));
    const [products, shops] = await Promise.all([
        prisma_1.default.products.findMany({
            where: {
                status: "active",
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                ],
            },
            orderBy: { created_at: "desc" },
            take: limit,
            select: {
                id: true,
                name: true,
                description: true,
                shop_id: true,
                created_at: true,
            },
        }),
        prisma_1.default.shops.findMany({
            where: {
                status: "approved",
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                ],
            },
            orderBy: { created_at: "desc" },
            take: limit,
            select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
            },
        }),
    ]);
    return { products, shops };
};
exports.searchAll = searchAll;
