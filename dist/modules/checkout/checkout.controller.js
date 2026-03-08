"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkout = void 0;
const checkout_service_1 = require("./checkout.service");
const checkout = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const result = await (0, checkout_service_1.checkoutCart)(req.userId, req.body || {});
        res.status(201).json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.checkout = checkout;
