"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearMyCart = exports.removeItem = exports.updateItem = exports.addItem = exports.getMyCart = void 0;
const cart_service_1 = require("./cart.service");
const getMyCart = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const cart = await (0, cart_service_1.getCart)(req.userId);
        res.json(cart);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getMyCart = getMyCart;
const addItem = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const item = await (0, cart_service_1.addCartItem)(req.userId, req.body);
        res.status(201).json({ item });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.addItem = addItem;
const updateItem = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const item = await (0, cart_service_1.updateCartItem)(req.userId, req.params.id, req.body);
        res.json({ item });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateItem = updateItem;
const removeItem = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        await (0, cart_service_1.removeCartItem)(req.userId, req.params.id);
        res.json({ message: "Removed" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.removeItem = removeItem;
const clearMyCart = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        await (0, cart_service_1.clearCart)(req.userId);
        res.json({ message: "Cleared" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.clearMyCart = clearMyCart;
