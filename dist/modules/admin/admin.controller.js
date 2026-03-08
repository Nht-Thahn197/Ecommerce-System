"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopDetail = exports.pendingShops = exports.recentOrders = exports.overview = void 0;
const admin_service_1 = require("./admin.service");
const overview = async (_req, res) => {
    try {
        const data = await (0, admin_service_1.getOverview)();
        res.json({ overview: data });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.overview = overview;
const recentOrders = async (req, res) => {
    try {
        const orders = await (0, admin_service_1.getRecentOrders)(req.query);
        res.json({ orders });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.recentOrders = recentOrders;
const pendingShops = async (req, res) => {
    try {
        const shops = await (0, admin_service_1.getPendingShops)(req.query);
        res.json({ shops });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.pendingShops = pendingShops;
const shopDetail = async (req, res) => {
    try {
        const shop = await (0, admin_service_1.getShopDetail)(req.params.id);
        res.json({ shop });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.shopDetail = shopDetail;
