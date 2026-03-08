"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVariantHandler = exports.updateVariantHandler = exports.createVariantHandler = exports.deleteProductHandler = exports.updateProductHandler = exports.createProductHandler = exports.updateStock = exports.uploadProductMedia = exports.getProduct = exports.getProducts = void 0;
const product_service_1 = require("./product.service");
const resolveParam = (value) => Array.isArray(value) ? value[0] : value;
const getProducts = async (req, res) => {
    try {
        const result = await (0, product_service_1.listProducts)(req.query);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getProducts = getProducts;
const getProduct = async (req, res) => {
    try {
        const id = resolveParam(req.params.id);
        if (!id) {
            return res.status(400).json({ message: "Product id is required" });
        }
        const product = await (0, product_service_1.getProductById)(id);
        res.json({ product });
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
};
exports.getProduct = getProduct;
const uploadProductMedia = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const validationError = req.fileValidationError;
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        const files = (req.files || {});
        const gallery = files.gallery || [];
        const cover = files.cover?.[0] || null;
        const video = files.video?.[0] || null;
        if (!gallery.length && !cover && !video) {
            return res.status(400).json({ message: "Khong co file media" });
        }
        res.json({
            media: {
                gallery: gallery.map((file) => `/ui/uploads/products/${file.filename}`),
                cover_image_url: cover
                    ? `/ui/uploads/products/${cover.filename}`
                    : null,
                video_url: video ? `/ui/uploads/products/${video.filename}` : null,
            },
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.uploadProductMedia = uploadProductMedia;
const updateStock = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const updated = await (0, product_service_1.updateVariantStock)(req.userId, req.params.id, req.body);
        res.json({ variant: updated });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateStock = updateStock;
const createProductHandler = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const product = await (0, product_service_1.createProduct)(req.userId, req.body);
        res.status(201).json({ product });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createProductHandler = createProductHandler;
const updateProductHandler = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const product = await (0, product_service_1.updateProduct)(req.userId, req.params.id, req.body);
        res.json({ product });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateProductHandler = updateProductHandler;
const deleteProductHandler = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        await (0, product_service_1.deleteProduct)(req.userId, req.params.id);
        res.json({ message: "Deleted" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteProductHandler = deleteProductHandler;
const createVariantHandler = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const variant = await (0, product_service_1.createVariant)(req.userId, req.params.id, req.body);
        res.status(201).json({ variant });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createVariantHandler = createVariantHandler;
const updateVariantHandler = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const variant = await (0, product_service_1.updateVariant)(req.userId, req.params.id, req.body);
        res.json({ variant });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateVariantHandler = updateVariantHandler;
const deleteVariantHandler = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        await (0, product_service_1.deleteVariant)(req.userId, req.params.id);
        res.json({ message: "Deleted" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteVariantHandler = deleteVariantHandler;
