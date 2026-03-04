import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../libs/prisma";

export type Role = "admin" | "customer";

export interface AuthRequest<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  userId?: string;
  userRole?: Role;
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ message: "No token" });

  const parts = header.split(" ");
  const token = parts.length === 2 ? parts[1] : parts[0];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ message: "JWT secret is not set" });
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      userId?: string;
      role?: string;
    };
    req.userId = decoded.userId;
    req.userRole = decoded.role as Role | undefined;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const requireRole =
  (...roles: Role[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

export const requireAdmin = requireRole("admin");
export const requireCustomer = requireRole("customer", "admin");

export const requireSeller = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const shop = await prisma.shops.findFirst({
      where: { owner_id: req.userId, status: "approved" },
      select: { id: true, status: true },
    });
    if (!shop) {
      return res.status(403).json({ message: "Seller only" });
    }
    next();
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
