"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocument = exports.updateStatus = exports.listPending = exports.listPublic = exports.myShops = exports.register = void 0;
const shop_service_1 = require("./shop.service");
const register = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const shop = await (0, shop_service_1.registerShop)(req.userId, req.body);
        res.status(201).json({ shop });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.register = register;
const myShops = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const shops = await (0, shop_service_1.getMyShops)(req.userId, req.query);
        res.json({ shops });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.myShops = myShops;
const listPublic = async (req, res) => {
    try {
        const shops = await (0, shop_service_1.listApprovedShops)(req.query);
        res.json({ shops });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.listPublic = listPublic;
const listPending = async (req, res) => {
    try {
        const shops = await (0, shop_service_1.listPendingShops)(req.query);
        res.json({ shops });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.listPending = listPending;
const updateStatus = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const shop = await (0, shop_service_1.updateShopStatus)(req.userId, req.params.id, req.body);
        res.json({ shop });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateStatus = updateStatus;
const uploadDocument = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const validationError = req.fileValidationError;
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        const files = (req.files || []);
        if (!files.length) {
            return res.status(400).json({ message: "Khong co file giay to" });
        }
        res.json({
            documents: files.map((file) => ({
                doc_url: `/ui/uploads/shop-documents/${file.filename}`,
                original_name: file.originalname,
                mime_type: file.mimetype,
                size: file.size,
            })),
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.uploadDocument = uploadDocument;
