"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockPayment = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const mockPayment = async (userId, input) => {
    if (!input.order_id) {
        throw new Error("order_id is required");
    }
    if (!["paid", "failed"].includes(input.status)) {
        throw new Error("Invalid payment status");
    }
    const order = await prisma_1.default.orders.findUnique({
        where: { id: input.order_id },
        select: {
            id: true,
            user_id: true,
            payment_method: true,
            payment_status: true,
            order_status: true,
        },
    });
    if (!order || order.user_id !== userId) {
        throw new Error("Order not found");
    }
    if (order.order_status === "cancelled") {
        throw new Error("Order is cancelled");
    }
    if (order.payment_method === "cod") {
        throw new Error("COD cannot use mock payment");
    }
    if (order.payment_status === "paid" && input.status === "paid") {
        throw new Error("Order already paid");
    }
    const updated = await prisma_1.default.orders.update({
        where: { id: input.order_id },
        data: { payment_status: input.status },
    });
    return updated;
};
exports.mockPayment = mockPayment;
