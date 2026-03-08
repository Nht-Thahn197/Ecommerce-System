"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const scheduler_1 = require("./jobs/scheduler");
const PORT = 3000;
app_1.default.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
(0, scheduler_1.startScheduler)();
