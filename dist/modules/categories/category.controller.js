"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategoryHandler = exports.updateCategoryHandler = exports.createCategoryHandler = exports.getCategory = exports.getCategories = void 0;
const category_service_1 = require("./category.service");
const toCategoryId = (value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Mã danh mục không hợp lệ");
    }
    return id;
};
const getCategories = async (req, res) => {
    try {
        const categories = await (0, category_service_1.listCategories)(req.query);
        res.json(categories);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.getCategories = getCategories;
const getCategory = async (req, res) => {
    try {
        const category = await (0, category_service_1.getCategoryById)(toCategoryId(req.params.id));
        res.json({ category });
    }
    catch (error) {
        res.status(404).json({ message: error.message });
    }
};
exports.getCategory = getCategory;
const createCategoryHandler = async (req, res) => {
    try {
        const category = await (0, category_service_1.createCategory)(req.body);
        res.status(201).json({ category });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createCategoryHandler = createCategoryHandler;
const updateCategoryHandler = async (req, res) => {
    try {
        const category = await (0, category_service_1.updateCategory)(toCategoryId(req.params.id), req.body);
        res.json({ category });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateCategoryHandler = updateCategoryHandler;
const deleteCategoryHandler = async (req, res) => {
    try {
        await (0, category_service_1.deleteCategory)(toCategoryId(req.params.id));
        res.json({ message: "Deleted" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.deleteCategoryHandler = deleteCategoryHandler;
