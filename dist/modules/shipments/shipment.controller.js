"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateShipment = exports.getShipment = void 0;
const shipment_service_1 = require("./shipment.service");
const getShipment = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const shipment = await (0, shipment_service_1.getShipmentForItem)(req.userId, req.params.itemId);
        res.json({ shipment });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getShipment = getShipment;
const updateShipment = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const shipment = await (0, shipment_service_1.updateShipmentForItem)(req.userId, req.params.itemId, req.body);
        res.json({ shipment });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateShipment = updateShipment;
