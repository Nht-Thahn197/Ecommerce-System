"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = void 0;
const search_service_1 = require("./search.service");
const search = async (req, res) => {
    try {
        const result = await (0, search_service_1.searchAll)(req.query);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.search = search;
