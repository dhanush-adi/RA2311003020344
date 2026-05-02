// src/controllers/notificationController.ts — Express request handlers

import { Request, Response } from "express";
import {
  createNotification,
  getNotificationFeed,
  readOneNotification,
  readManyNotifications,
  fetchUnreadCount,
} from "../services/notificationService";
import { getPriorityInbox } from "../services/priorityInboxService";
import { NotificationCategory, ApiResponse } from "../types";
import { createLogger } from "logging-middleware";

const ctrlLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

// Default student for demo (pre-auth as per evaluation terms)
const DEMO_STUDENT_ID = "stu-demo-0001";

/** POST /api/v1/notifications */
export async function handleCreateNotification(req: Request, res: Response): Promise<void> {
  try {
    const { type, message, targetStudentIds, broadcastToAll } = req.body as {
      type: NotificationCategory;
      message: string;
      targetStudentIds?: string[];
      broadcastToAll?: boolean;
    };

    if (!type || !message) {
      res.status(400).json({ success: false, error: "type and message are required" });
      return;
    }

    const validTypes: NotificationCategory[] = ["Event", "Result", "Placement"];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: `type must be one of ${validTypes.join(", ")}` });
      return;
    }

    const result = await createNotification({ type, message, targetStudentIds, broadcastToAll });
    ctrlLogger.info("controller", `Notification created: ${result.notificationId}`);

    // Emit real-time event via Socket.io (attached to app)
    const io = req.app.get("io");
    if (io) {
      const payload = { notificationId: result.notificationId, type, message, createdAt: new Date().toISOString() };
      if (broadcastToAll) {
        io.emit("notification:new", payload);
      } else if (targetStudentIds) {
        targetStudentIds.forEach((sid) => io.to(`student:${sid}`).emit("notification:new", payload));
      }
    }

    res.status(201).json({ success: true, data: { ...result, type, message, createdAt: new Date().toISOString() } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    ctrlLogger.error("controller", `createNotification failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

/** GET /api/v1/notifications */
export async function handleGetFeed(req: Request, res: Response): Promise<void> {
  try {
    const studentId   = (req.query.studentId as string) ?? DEMO_STUDENT_ID;
    const page        = parseInt((req.query.page  as string) ?? "1",  10);
    const limit       = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 100);
    const typeFilter  = req.query.type  as NotificationCategory | undefined;
    const isReadStr   = req.query.isRead as string | undefined;
    const isReadFilter = isReadStr !== undefined ? isReadStr === "true" : undefined;

    const result = await getNotificationFeed(studentId, page, limit, typeFilter, isReadFilter);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    ctrlLogger.error("controller", `getNotificationFeed failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

/** PATCH /api/v1/notifications/:notificationId/read */
export async function handleMarkOneRead(req: Request, res: Response): Promise<void> {
  try {
    const { notificationId } = req.params;
    const studentId = (req.query.studentId as string) ?? DEMO_STUDENT_ID;
    const updated = await readOneNotification(notificationId, studentId);

    // Emit updated unread count
    const io = req.app.get("io");
    if (io && updated) {
      const count = await fetchUnreadCount(studentId);
      io.to(`student:${studentId}`).emit("notification:unread_count", { count });
    }

    res.json({ success: true, data: { notificationId, isRead: true, readAt: new Date().toISOString() } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    ctrlLogger.error("controller", `markOneRead failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

/** PATCH /api/v1/notifications/bulk-read */
export async function handleBulkRead(req: Request, res: Response): Promise<void> {
  try {
    const { notificationIds = [], markAllRead = false } = req.body as {
      notificationIds?: string[];
      markAllRead?: boolean;
    };
    const studentId = (req.query.studentId as string) ?? DEMO_STUDENT_ID;
    const updatedCount = await readManyNotifications(notificationIds, studentId, markAllRead);
    ctrlLogger.info("controller", `Bulk read: ${updatedCount} notifications updated for student=${studentId}`);
    res.json({ success: true, data: { updatedCount } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    ctrlLogger.error("controller", `bulkRead failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

/** GET /api/v1/notifications/unread-count */
export async function handleUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const studentId = (req.query.studentId as string) ?? DEMO_STUDENT_ID;
    const unreadCount = await fetchUnreadCount(studentId);
    res.json({ success: true, data: { unreadCount } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    ctrlLogger.error("controller", `unreadCount failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

/** GET /api/v1/notifications/priority-inbox */
export async function handlePriorityInbox(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "10", 10), 50);
    ctrlLogger.info("controller", `Priority inbox requested: limit=${limit}`);
    const topNotifications = await getPriorityInbox(limit);
    res.json({ success: true, data: { notifications: topNotifications } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    ctrlLogger.error("controller", `priorityInbox failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}
