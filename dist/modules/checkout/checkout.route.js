"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const checkout_controller_1 = require("./checkout.controller");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.authMiddleware, checkout_controller_1.checkout);
exports.default = router;
