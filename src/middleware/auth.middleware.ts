import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../libs/prisma";

export type Role = "admin" | "staff" | "customer";

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

  jwt.verify(
    token,
    secret,
    async (
      error,
      decoded: jwt.JwtPayload | string | undefined
    ) => {
      if (error || !decoded || typeof decoded === "string") {
        return res.status(401).json({ message: "Invalid token" });
      }

      const userId = typeof decoded.userId === "string" ? decoded.userId : "";
      if (!userId) {
        return res.status(401).json({ message: "Invalid token" });
      }

      try {
        const user = await prisma.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
            status: true,
          },
        });

        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        if (user.status && user.status !== "active") {
          return res
            .status(401)
            .json({ message: "Tài khoản đã bị khóa hoặc ngưng hoạt động" });
        }

        const role = (user.role || "customer").toLowerCase();

        req.userId = user.id;
        req.userRole =
          role === "admin" || role === "staff" ? role : "customer";

        next();
      } catch {
        res.status(500).json({ message: "Server error" });
      }
    }
  );
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
export const requireAdminAccess = requireRole("admin", "staff");
export const requireCustomer = requireRole("customer", "staff", "admin");

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
