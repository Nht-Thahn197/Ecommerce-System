import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getProductById,
  listProducts,
  updateVariantStock,
} from "./product.service";
import { ListProductsQuery, UpdateVariantStockInput } from "./product.types";

const resolveParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const getProducts = async (
  req: Request<{}, {}, {}, ListProductsQuery>,
  res: Response
) => {
  try {
    const result = await listProducts(req.query);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getProduct = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const id = resolveParam(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Product id is required" });
    }
    const product = await getProductById(id);
    res.json({ product });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const updateStock = async (
  req: AuthRequest<{ id: string }, {}, UpdateVariantStockInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const updated = await updateVariantStock(
      req.userId,
      req.params.id,
      req.body
    );
    res.json({ variant: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
