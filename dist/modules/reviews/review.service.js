"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReviewByAdmin = exports.updateReview = exports.createReview = exports.getRatingSummary = exports.listReviews = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const MAX_LIMIT = 100;
const toNumber = (value) => {
    if (!value)
        return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
};
const listReviews = async (query) => {
    if (!query.product_id) {
        throw new Error("product_id is required");
    }
    const page = Math.max(1, toNumber(query.page) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(query.limit) || 20));
    const skip = (page - 1) * limit;
    const where = { product_id: query.product_id };
    const [total, stats, items] = await Promise.all([
        prisma_1.default.reviews.count({ where }),
        prisma_1.default.reviews.aggregate({
            where,
            _avg: { rating: true },
        }),
        prisma_1.default.reviews.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: "desc" },
            select: {
                id: true,
                rating: true,
                comment: true,
                created_at: true,
                users: {
                    select: {
                        id: true,
                        full_name: true,
                    },
                },
            },
        }),
    ]);
    return {
        data: items,
        pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
        },
        summary: {
            total_reviews: total,
            average_rating: stats._avg.rating ?? 0,
        },
    };
};
exports.listReviews = listReviews;
const getRatingSummary = async (productId) => {
    if (!productId) {
        throw new Error("product_id is required");
    }
    const [total, stats] = await Promise.all([
        prisma_1.default.reviews.count({ where: { product_id: productId } }),
        prisma_1.default.reviews.aggregate({
            where: { product_id: productId },
            _avg: { rating: true },
            _count: { rating: true },
        }),
    ]);
    return {
        product_id: productId,
        total_reviews: total,
        average_rating: stats._avg.rating ?? 0,
    };
};
exports.getRatingSummary = getRatingSummary;
const createReview = async (userId, input) => {
    if (!input.product_id) {
        throw new Error("product_id is required");
    }
    if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) {
        throw new Error("rating must be between 1 and 5");
    }
    const product = await prisma_1.default.products.findUnique({
        where: { id: input.product_id },
        select: { id: true },
    });
    if (!product) {
        throw new Error("Product not found");
    }
    const purchased = await prisma_1.default.order_items.findFirst({
        where: {
            status: "received",
            orders: { user_id: userId },
            product_variants: { products: { id: input.product_id } },
        },
        select: { id: true },
    });
    if (!purchased) {
        throw new Error("Only buyers can review this product");
    }
    const existing = await prisma_1.default.reviews.findFirst({
        where: { product_id: input.product_id, user_id: userId },
        select: { id: true },
    });
    if (existing) {
        throw new Error("You already reviewed this product");
    }
    const comment = input.comment?.trim();
    const review = await prisma_1.default.reviews.create({
        data: {
            product_id: input.product_id,
            user_id: userId,
            rating: Math.floor(input.rating),
            comment: comment || null,
        },
        select: {
            id: true,
            rating: true,
            comment: true,
            created_at: true,
            users: { select: { id: true, full_name: true } },
        },
    });
    return review;
};
exports.createReview = createReview;
const updateReview = async (userId, reviewId, input) => {
    const review = await prisma_1.default.reviews.findUnique({
        where: { id: reviewId },
        select: { id: true, user_id: true },
    });
    if (!review) {
        throw new Error("Review not found");
    }
    if (review.user_id !== userId) {
        throw new Error("Unauthorized");
    }
    const data = {};
    if (input.rating !== undefined) {
        if (!Number.isFinite(input.rating) ||
            input.rating < 1 ||
            input.rating > 5) {
            throw new Error("rating must be between 1 and 5");
        }
        data.rating = Math.floor(input.rating);
    }
    if (input.comment !== undefined) {
        const comment = input.comment.trim();
        data.comment = comment.length ? comment : null;
    }
    const updated = await prisma_1.default.reviews.update({
        where: { id: reviewId },
        data,
        select: {
            id: true,
            rating: true,
            comment: true,
            created_at: true,
            users: { select: { id: true, full_name: true } },
        },
    });
    return updated;
};
exports.updateReview = updateReview;
const deleteReviewByAdmin = async (reviewId) => {
    const existing = await prisma_1.default.reviews.findUnique({
        where: { id: reviewId },
        select: { id: true },
    });
    if (!existing) {
        throw new Error("Review not found");
    }
    await prisma_1.default.reviews.delete({
        where: { id: reviewId },
    });
};
exports.deleteReviewByAdmin = deleteReviewByAdmin;
