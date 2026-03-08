"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShopDetail = exports.getPendingShops = exports.getRecentOrders = exports.getOverview = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const shop_service_1 = require("../shops/shop.service");
const MAX_LIMIT = 100;
const toNumber = (value) => {
    if (!value)
        return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
};
const getPagination = (query) => {
    const page = Math.max(1, toNumber(query?.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(query?.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
const getOverview = async () => {
    const [usersCount, shopsCount, approvedShopsCount, pendingShopsCount, productsCount, ordersCount, reviewsCount, revenueAgg, orderStatusGroup, paymentStatusGroup,] = await Promise.all([
        prisma_1.default.users.count(),
        prisma_1.default.shops.count(),
        prisma_1.default.shops.count({ where: { status: "approved" } }),
        prisma_1.default.shops.count({ where: { status: "pending" } }),
        prisma_1.default.products.count(),
        prisma_1.default.orders.count(),
        prisma_1.default.reviews.count(),
        prisma_1.default.orders.aggregate({
            where: { payment_status: "paid" },
            _sum: { total_amount: true },
        }),
        prisma_1.default.orders.groupBy({
            by: ["order_status"],
            _count: { _all: true },
        }),
        prisma_1.default.orders.groupBy({
            by: ["payment_status"],
            _count: { _all: true },
        }),
    ]);
    const totalRevenue = Number(revenueAgg._sum.total_amount || 0);
    return {
        counts: {
            users: usersCount,
            shops: shopsCount,
            shops_approved: approvedShopsCount,
            shops_pending: pendingShopsCount,
            products: productsCount,
            orders: ordersCount,
            reviews: reviewsCount,
        },
        revenue: {
            total_paid: totalRevenue,
        },
        order_status: orderStatusGroup.map((row) => ({
            status: row.order_status || "unknown",
            count: row._count._all,
        })),
        payment_status: paymentStatusGroup.map((row) => ({
            status: row.payment_status || "unknown",
            count: row._count._all,
        })),
    };
};
exports.getOverview = getOverview;
const getRecentOrders = async (query) => {
    const { page, limit, skip } = getPagination(query);
    const [total, orders] = await Promise.all([
        prisma_1.default.orders.count(),
        prisma_1.default.orders.findMany({
            orderBy: { created_at: "desc" },
            skip,
            take: limit,
            select: {
                id: true,
                user_id: true,
                total_amount: true,
                payment_method: true,
                payment_status: true,
                order_status: true,
                created_at: true,
                users: {
                    select: { id: true, email: true, full_name: true },
                },
            },
        }),
    ]);
    return {
        data: orders,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
        },
    };
};
exports.getRecentOrders = getRecentOrders;
const getPendingShops = async (query) => {
    return (0, shop_service_1.listPendingShops)(query || {});
};
exports.getPendingShops = getPendingShops;
const getShopDetail = async (shopId) => {
    return (0, shop_service_1.getShopDetailById)(shopId);
};
exports.getShopDetail = getShopDetail;
