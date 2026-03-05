import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  listMyReturns,
  listDisputes,
  listPendingReturns,
  requestDispute,
  requestReturn,
  resolveDispute,
  updateReturnStatus,
} from "./return.service";
import {
  CreateDisputeInput,
  CreateReturnInput,
  ListReturnsQuery,
  ResolveDisputeInput,
  UpdateReturnStatusInput,
} from "./return.types";

export const createReturn = async (
  req: AuthRequest<{}, {}, CreateReturnInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const ret = await requestReturn(req.userId, req.body);
    res.status(201).json({ return: ret });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const myReturns = async (
  req: AuthRequest<{}, {}, {}, ListReturnsQuery>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const returns = await listMyReturns(req.userId, req.query);
    res.json({ returns });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const pendingReturns = async (
  req: AuthRequest<{}, {}, {}, ListReturnsQuery>,
  res: Response
) => {
  try {
    const returns = await listPendingReturns(req.query);
    res.json({ returns });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateReturn = async (
  req: AuthRequest<{ id: string }, {}, UpdateReturnStatusInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await updateReturnStatus(req.userId, req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const createDispute = async (
  req: AuthRequest<{ id: string }, {}, CreateDisputeInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const ret = await requestDispute(req.userId, req.params.id, req.body);
    res.status(201).json({ return: ret });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const pendingDisputes = async (
  req: AuthRequest<{}, {}, {}, ListReturnsQuery>,
  res: Response
) => {
  try {
    const returns = await listDisputes(req.query);
    res.json({ returns });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDispute = async (
  req: AuthRequest<{ id: string }, {}, ResolveDisputeInput>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await resolveDispute(req.userId, req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
