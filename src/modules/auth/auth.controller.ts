import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  getCurrentUser,
  loginUser,
  logoutAllUserTokens,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "./auth.service";
import {
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
} from "./auth.types";

export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response
) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json({ user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response
) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await getCurrentUser(req.userId);
    res.json({ user });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const refresh = async (
  req: Request<{}, {}, RefreshTokenInput>,
  res: Response
) => {
  try {
    const result = await refreshAccessToken(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ message: error.message });
  }
};

export const logout = async (
  req: Request<{}, {}, LogoutInput>,
  res: Response
) => {
  try {
    await logoutUser(req.body);
    res.json({ message: "Logged out" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const logoutAll = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    await logoutAllUserTokens(req.userId);
    res.json({ message: "Logged out all sessions" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
