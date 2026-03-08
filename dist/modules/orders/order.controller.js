"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOrderPayment = exports.updateItemStatus = exports.getSellerItems = exports.getMyOrder = exports.getMyOrders = void 0;
const order_service_1 = require("./order.service");
const getMyOrders = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const orders = await (0, order_service_1.listOrdersForUser)(req.userId, req.query);
        res.json({ orders });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getMyOrders = getMyOrders;
const getMyOrder = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const order = await (0, order_service_1.getOrderForUser)(req.userId, req.params.id);
        res.json({ order });
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
};
exports.getMyOrder = getMyOrder;
const getSellerItems = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const items = await (0, order_service_1.listOrderItemsForSeller)(req.userId, req.query);
        res.json({ items });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getSellerItems = getSellerItems;
const updateItemStatus = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const result = await (0, order_service_1.updateOrderItemStatus)(req.userId, req.params.id, req.body.status);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateItemStatus = updateItemStatus;
const updateOrderPayment = async (req, res) => {
    try {
        const order = await (0, order_service_1.updatePaymentStatus)(req.params.id, req.body.payment_status);
        res.json({ order });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateOrderPayment = updateOrderPayment;
