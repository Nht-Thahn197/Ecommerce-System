"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVoucher = exports.updateVoucher = exports.createVoucher = exports.adminVoucherDetail = exports.adminVouchers = exports.updateProductStatus = exports.adminProducts = exports.shopDetail = exports.pendingShops = exports.recentOrders = exports.overview = void 0;
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
const adminProducts = async (req, res) => {
    try {
        const products = await (0, admin_service_1.getAdminProducts)(req.query);
        res.json({ products });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.adminProducts = adminProducts;
const updateProductStatus = async (req, res) => {
    try {
        const product = await (0, admin_service_1.updateProductStatusByAdmin)(req.params.id, req.body?.status);
        res.json({ product });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateProductStatus = updateProductStatus;
const adminVouchers = async (req, res) => {
    try {
        const vouchers = await (0, admin_service_1.getAdminVouchers)(req.query);
        res.json({ vouchers });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.adminVouchers = adminVouchers;
const adminVoucherDetail = async (req, res) => {
    try {
        const voucher = await (0, admin_service_1.getAdminVoucherById)(req.params.id);
        res.json({ voucher });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.adminVoucherDetail = adminVoucherDetail;
const createVoucher = async (req, res) => {
    try {
        const voucher = await (0, admin_service_1.createAdminVoucher)(req.body || {});
        res.status(201).json({ voucher });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createVoucher = createVoucher;
const updateVoucher = async (req, res) => {
    try {
        const voucher = await (0, admin_service_1.updateAdminVoucher)(req.params.id, req.body || {});
        res.json({ voucher });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateVoucher = updateVoucher;
const deleteVoucher = async (req, res) => {
    try {
        await (0, admin_service_1.deleteAdminVoucher)(req.params.id);
        res.json({ message: "Deleted" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteVoucher = deleteVoucher;
