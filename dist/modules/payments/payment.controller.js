"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockPay = void 0;
const payment_service_1 = require("./payment.service");
const mockPay = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const order = await (0, payment_service_1.mockPayment)(req.userId, req.body);
        res.json({ order });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.mockPay = mockPay;
