import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { searchAll } from "./search.service";
import { SearchQuery } from "./search.types";

export const search = async (
  req: AuthRequest<{}, {}, {}, SearchQuery>,
  res: Response
) => {
  try {
    const result = await searchAll(req.query);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
