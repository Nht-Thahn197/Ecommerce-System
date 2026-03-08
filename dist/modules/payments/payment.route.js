"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const payment_controller_1 = require("./payment.controller");
const router = (0, express_1.Router)();
router.post("/mock", auth_middleware_1.authMiddleware, auth_middleware_1.requireCustomer, payment_controller_1.mockPay);
exports.default = router;
