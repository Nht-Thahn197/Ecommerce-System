"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const user_service_1 = require("./user.service");
const getUsers = async (req, res) => {
    const users = await (0, user_service_1.getAllUsers)();
    res.json(users);
};
exports.getUsers = getUsers;
