import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import {
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service";
import { ListNotificationsQuery } from "./notification.types";

export const getMyNotifications = async (
  req: AuthRequest<{}, {}, {}, ListNotificationsQuery>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const notifications = await listNotificationsForUser(req.userId, req.query);
    res.json({ notifications });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const readMyNotification = async (
  req: AuthRequest<{ id: string }>,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await markNotificationRead(req.userId, req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const readAllMyNotifications = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    const result = await markAllNotificationsRead(req.userId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
