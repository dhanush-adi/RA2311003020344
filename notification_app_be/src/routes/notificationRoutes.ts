// src/routes/notificationRoutes.ts — All notification REST routes

import { Router } from "express";
import {
  handleCreateNotification,
  handleGetFeed,
  handleMarkOneRead,
  handleBulkRead,
  handleUnreadCount,
  handlePriorityInbox,
} from "../controllers/notificationController";

const notifRouter = Router();

// Create a new notification
notifRouter.post("/", handleCreateNotification);

// Priority inbox — must come before /:notificationId routes
notifRouter.get("/priority-inbox", handlePriorityInbox);

// Unread badge count
notifRouter.get("/unread-count", handleUnreadCount);

// Bulk mark as read
notifRouter.patch("/bulk-read", handleBulkRead);

// Paginated notification feed
notifRouter.get("/", handleGetFeed);

// Mark single notification as read
notifRouter.patch("/:notificationId/read", handleMarkOneRead);

export { notifRouter };
