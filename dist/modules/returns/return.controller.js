"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDispute = exports.pendingDisputes = exports.createDispute = exports.updateReturn = exports.pendingReturns = exports.myReturns = exports.createReturn = void 0;
const return_service_1 = require("./return.service");
const createReturn = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const ret = await (0, return_service_1.requestReturn)(req.userId, req.body);
        res.status(201).json({ return: ret });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createReturn = createReturn;
const myReturns = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const returns = await (0, return_service_1.listMyReturns)(req.userId, req.query);
        res.json({ returns });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.myReturns = myReturns;
const pendingReturns = async (req, res) => {
    try {
        const returns = await (0, return_service_1.listPendingReturns)(req.query);
        res.json({ returns });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.pendingReturns = pendingReturns;
const updateReturn = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const result = await (0, return_service_1.updateReturnStatus)(req.userId, req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateReturn = updateReturn;
const createDispute = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const ret = await (0, return_service_1.requestDispute)(req.userId, req.params.id, req.body);
        res.status(201).json({ return: ret });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.createDispute = createDispute;
const pendingDisputes = async (req, res) => {
    try {
        const returns = await (0, return_service_1.listDisputes)(req.query);
        res.json({ returns });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.pendingDisputes = pendingDisputes;
const updateDispute = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const result = await (0, return_service_1.resolveDispute)(req.userId, req.params.id, req.body);
        res.json(result);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateDispute = updateDispute;
