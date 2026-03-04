import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  addItem,
  clearMyCart,
  getMyCart,
  removeItem,
  updateItem,
} from "./cart.controller";

const router = Router();

router.get("/", authMiddleware, getMyCart);
router.post("/items", authMiddleware, addItem);
router.patch("/items/:id", authMiddleware, updateItem);
router.delete("/items/:id", authMiddleware, removeItem);
router.delete("/clear", authMiddleware, clearMyCart);

export default router;
