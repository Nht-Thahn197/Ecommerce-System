import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from "./category.service";
import {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "./category.types";

const toCategoryId = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Mã danh mục không hợp lệ");
  }
  return id;
};

export const getCategories = async (
  req: Request<{}, {}, {}, ListCategoriesQuery>,
  res: Response
) => {
  try {
    const categories = await listCategories(req.query);
    res.json(categories);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getCategory = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const category = await getCategoryById(toCategoryId(req.params.id));
    res.json({ category });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

export const createCategoryHandler = async (
  req: AuthRequest<{}, {}, CreateCategoryInput>,
  res: Response
) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ category });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCategoryHandler = async (
  req: AuthRequest<{ id: string }, {}, UpdateCategoryInput>,
  res: Response
) => {
  try {
    const category = await updateCategory(toCategoryId(req.params.id), req.body);
    res.json({ category });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCategoryHandler = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    await deleteCategory(toCategoryId(req.params.id));
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

