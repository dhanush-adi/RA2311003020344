// src/services/notificationService.ts — Business logic for notification CRUD

import { v4 as uuidv4 } from "uuid";
import {
  insertNotification,
  insertRecipients,
  fetchAllStudentIds,
  fetchNotificationFeed,
  markOneRead,
  markManyRead,
  markAllRead,
  getUnreadCount,
} from "../models/notificationModel";
import {
  NotificationCategory,
  NotificationFeedItem,
  PaginationMeta,
} from "../types";
import { createLogger } from "logging-middleware";

const svcLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

export interface CreateNotificationInput {
  type: NotificationCategory;
  message: string;
  targetStudentIds?: string[];
  broadcastToAll?: boolean;
}

/** Create a notification and fan it out to recipients */
export async function createNotification(
  input: CreateNotificationInput,
  createdBy?: string
): Promise<{ notificationId: string; recipientCount: number }> {
  svcLogger.info("service", `Creating ${input.type} notification: "${input.message.substring(0, 50)}"`);

  const notif = await insertNotification(input.type, input.message, createdBy);

  let recipientIds: string[] = input.targetStudentIds ?? [];
  if (input.broadcastToAll) {
    recipientIds = await fetchAllStudentIds();
    svcLogger.info("service", `Broadcast mode: fanning out to ${recipientIds.length} students`);
  }

  const insertedCount = await insertRecipients(notif.notification_id, recipientIds);
  svcLogger.info("service", `Notification ${notif.notification_id} delivered to ${insertedCount} recipients`);

  return { notificationId: notif.notification_id, recipientCount: insertedCount };
}

/** Fetch paginated notification feed for a student */
export async function getNotificationFeed(
  studentId: string,
  page: number,
  limit: number,
  typeFilter?: NotificationCategory,
  isReadFilter?: boolean
): Promise<{ items: NotificationFeedItem[]; pagination: PaginationMeta }> {
  svcLogger.info("service", `Fetching feed: student=${studentId} page=${page} limit=${limit}`);

  const { items, total } = await fetchNotificationFeed(
    studentId, page, limit, typeFilter, isReadFilter
  );

  const totalPages = Math.ceil(total / limit);
  return {
    items,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      hasNextPage: page < totalPages,
    },
  };
}

/** Mark a single notification as read */
export async function readOneNotification(
  notificationId: string,
  studentId: string
): Promise<boolean> {
  svcLogger.info("service", `Marking read: notif=${notificationId} student=${studentId}`);
  const updated = await markOneRead(notificationId, studentId);
  if (!updated) {
    svcLogger.warn("service", `Mark-read no-op: notif=${notificationId} already read or not found`);
  }
  return updated;
}

/** Bulk mark notifications as read */
export async function readManyNotifications(
  notificationIds: string[],
  studentId: string,
  markAll: boolean
): Promise<number> {
  svcLogger.info("service", `Bulk mark-read: student=${studentId} markAll=${markAll} ids=${notificationIds.length}`);
  if (markAll) {
    return markAllRead(studentId);
  }
  return markManyRead(notificationIds, studentId);
}

/** Get unread notification count for badge display */
export async function fetchUnreadCount(studentId: string): Promise<number> {
  const count = await getUnreadCount(studentId);
  svcLogger.debug("service", `Unread count for student=${studentId}: ${count}`);
  return count;
}
