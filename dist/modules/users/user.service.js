"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const getAllUsers = async () => {
    return prisma_1.default.users.findMany({
        select: {
            id: true,
            email: true,
            full_name: true,
            role: true,
            status: true,
            created_at: true,
            updated_at: true,
        },
    });
};
exports.getAllUsers = getAllUsers;
