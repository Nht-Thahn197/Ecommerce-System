import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createProduct,
  createVariant,
  deleteProduct,
  deleteVariant,
  getProductById,
  listProducts,
  updateProduct,
  updateVariant,
  updateVariantStock,
} from "./product.service";
import {
  CreateProductInput,
  CreateVariantInput,
  ListProductsQuery,
  UpdateProductInput,
  UpdateVariantInput,
  UpdateVariantStockInput,
} from "./product.types";

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

export const createProductHandler = async (
  req: AuthRequest<{}, {}, CreateProductInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const product = await createProduct(req.userId, req.body);
    res.status(201).json({ product });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProductHandler = async (
  req: AuthRequest<{ id: string }, {}, UpdateProductInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const product = await updateProduct(req.userId, req.params.id, req.body);
    res.json({ product });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProductHandler = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    await deleteProduct(req.userId, req.params.id);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createVariantHandler = async (
  req: AuthRequest<{ id: string }, {}, CreateVariantInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const variant = await createVariant(req.userId, req.params.id, req.body);
    res.status(201).json({ variant });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateVariantHandler = async (
  req: AuthRequest<{ id: string }, {}, UpdateVariantInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const variant = await updateVariant(req.userId, req.params.id, req.body);
    res.json({ variant });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteVariantHandler = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    await deleteVariant(req.userId, req.params.id);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
