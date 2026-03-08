"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAll = exports.logout = exports.refresh = exports.uploadAvatar = exports.updateMe = exports.me = exports.login = exports.register = void 0;
const auth_service_1 = require("./auth.service");
const register = async (req, res) => {
    try {
        const user = await (0, auth_service_1.registerUser)(req.body);
        res.status(201).json({ user });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const result = await (0, auth_service_1.loginUser)(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(401).json({ message: error.message });
    }
};
exports.login = login;
const me = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const user = await (0, auth_service_1.getCurrentUser)(req.userId);
        res.json({ user });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.me = me;
const updateMe = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const user = await (0, auth_service_1.updateProfile)(req.userId, req.body);
        res.json({ user });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.updateMe = updateMe;
const uploadAvatar = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        const validationError = req.fileValidationError;
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "Không có ảnh" });
        }
        const avatarUrl = `/ui/uploads/avatars/${file.filename}`;
        const user = await (0, auth_service_1.updateAvatar)(req.userId, avatarUrl);
        res.json({ user });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.uploadAvatar = uploadAvatar;
const refresh = async (req, res) => {
    try {
        const result = await (0, auth_service_1.refreshAccessToken)(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(401).json({ message: error.message });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        await (0, auth_service_1.logoutUser)(req.body);
        res.json({ message: "Logged out" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.logout = logout;
const logoutAll = async (req, res) => {
    try {
        if (!req.userId)
            return res.status(401).json({ message: "Unauthorized" });
        await (0, auth_service_1.logoutAllUserTokens)(req.userId);
        res.json({ message: "Logged out all sessions" });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
exports.logoutAll = logoutAll;
