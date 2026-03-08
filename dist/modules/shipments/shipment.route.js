"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const shipment_controller_1 = require("./shipment.controller");
const router = (0, express_1.Router)();
router.get("/items/:itemId", auth_middleware_1.authMiddleware, shipment_controller_1.getShipment);
router.patch("/items/:itemId", auth_middleware_1.authMiddleware, auth_middleware_1.requireSeller, shipment_controller_1.updateShipment);
exports.default = router;
