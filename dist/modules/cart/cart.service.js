"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCart = exports.removeCartItem = exports.updateCartItem = exports.addCartItem = exports.getCart = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const MAX_QUANTITY = 99;
const parseQuantity = (value, fallback) => {
    if (value === undefined || value === null)
        return fallback;
    if (!Number.isFinite(value))
        return fallback;
    return Math.floor(value);
};
const clampQuantity = (value) => Math.min(MAX_QUANTITY, Math.max(1, value));
const cartItemSelect = {
    id: true,
    quantity: true,
    created_at: true,
    updated_at: true,
    product_variants: {
        select: {
            id: true,
            sku: true,
            price: true,
            stock: true,
            image_url: true,
            option_values: true,
            products: {
                select: {
                    id: true,
                    name: true,
                    status: true,
                    shop_id: true,
                },
            },
        },
    },
};
const buildCartSummary = (items) => {
    const total_quantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const total_amount = items.reduce((sum, item) => {
        const price = Number(item.product_variants?.price || 0);
        return sum + price * (item.quantity || 0);
    }, 0);
    return { total_quantity, total_amount };
};
const getCart = async (userId) => {
    const items = await prisma_1.default.cart_items.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
        select: cartItemSelect,
    });
    return {
        items,
        summary: buildCartSummary(items),
    };
};
exports.getCart = getCart;
const addCartItem = async (userId, input) => {
    if (!input.product_variant_id) {
        throw new Error("Product variant id is required");
    }
    const quantity = clampQuantity(parseQuantity(input.quantity, 1));
    const variant = await prisma_1.default.product_variants.findUnique({
        where: { id: input.product_variant_id },
        select: { id: true, products: { select: { status: true } } },
    });
    if (!variant || variant.products?.status !== "active") {
        throw new Error("Product variant not found");
    }
    const item = await prisma_1.default.cart_items.upsert({
        where: {
            user_id_product_variant_id: {
                user_id: userId,
                product_variant_id: input.product_variant_id,
            },
        },
        update: {
            quantity: {
                increment: quantity,
            },
            updated_at: new Date(),
        },
        create: {
            user_id: userId,
            product_variant_id: input.product_variant_id,
            quantity,
        },
        select: cartItemSelect,
    });
    return item;
};
exports.addCartItem = addCartItem;
const updateCartItem = async (userId, itemId, input) => {
    const quantity = parseQuantity(input.quantity, 0);
    const existing = await prisma_1.default.cart_items.findFirst({
        where: { id: itemId, user_id: userId },
        select: { id: true },
    });
    if (!existing) {
        throw new Error("Cart item not found");
    }
    if (quantity <= 0) {
        await prisma_1.default.cart_items.delete({
            where: { id: itemId },
        });
        return null;
    }
    const updated = await prisma_1.default.cart_items.update({
        where: { id: itemId },
        data: {
            quantity: clampQuantity(quantity),
            updated_at: new Date(),
        },
        select: cartItemSelect,
    });
    return updated;
};
exports.updateCartItem = updateCartItem;
const removeCartItem = async (userId, itemId) => {
    const existing = await prisma_1.default.cart_items.findFirst({
        where: { id: itemId, user_id: userId },
        select: { id: true },
    });
    if (!existing) {
        throw new Error("Cart item not found");
    }
    await prisma_1.default.cart_items.delete({
        where: { id: itemId },
    });
};
exports.removeCartItem = removeCartItem;
const clearCart = async (userId) => {
    await prisma_1.default.cart_items.deleteMany({
        where: { user_id: userId },
    });
};
exports.clearCart = clearCart;
