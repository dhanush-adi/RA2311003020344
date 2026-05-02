// src/models/notificationModel.ts — DB query functions for notifications

import { dbPool } from "../config/db";
import { NotificationRecord, NotificationFeedItem, NotificationCategory } from "../types";

/** Insert a new notification record */
export async function insertNotification(
  type: NotificationCategory,
  message: string,
  createdBy?: string
): Promise<NotificationRecord> {
  const result = await dbPool.query<NotificationRecord>(
    `INSERT INTO notifications (type, message, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [type, message, createdBy ?? null]
  );
  return result.rows[0];
}

/** Insert recipient rows (fan-out to students) */
export async function insertRecipients(
  notificationId: string,
  studentIds: string[]
): Promise<number> {
  if (studentIds.length === 0) return 0;

  // Build parameterised bulk insert
  const valueClauses = studentIds.map((_, idx) => `($1, $${idx + 2})`).join(", ");
  const params: unknown[] = [notificationId, ...studentIds];

  const result = await dbPool.query(
    `INSERT INTO notification_recipients (notification_id, student_id)
     VALUES ${valueClauses}
     ON CONFLICT DO NOTHING`,
    params
  );
  return result.rowCount ?? 0;
}

/** Fetch all student IDs from DB (for broadcastToAll) */
export async function fetchAllStudentIds(): Promise<string[]> {
  const result = await dbPool.query<{ student_id: string }>(
    `SELECT student_id FROM students`
  );
  return result.rows.map((r) => r.student_id);
}

/** Paginated unread/all notification feed for a student */
export async function fetchNotificationFeed(
  studentId: string,
  page: number,
  limit: number,
  typeFilter?: NotificationCategory,
  isReadFilter?: boolean
): Promise<{ items: NotificationFeedItem[]; total: number }> {
  const conditions: string[] = ["nr.student_id = $1"];
  const params: unknown[] = [studentId];
  let paramIdx = 2;

  if (isReadFilter !== undefined) {
    conditions.push(`nr.is_read = $${paramIdx++}`);
    params.push(isReadFilter);
  }
  if (typeFilter) {
    conditions.push(`n.type = $${paramIdx++}`);
    params.push(typeFilter);
  }

  const whereClause = conditions.join(" AND ");
  const offset = (page - 1) * limit;

  const countResult = await dbPool.query<{ count: string }>(
    `SELECT COUNT(*) FROM notification_recipients nr
     INNER JOIN notifications n ON nr.notification_id = n.notification_id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await dbPool.query<NotificationFeedItem>(
    `SELECT nr.notification_id, nr.is_read, nr.read_at, nr.delivered_at,
            n.type, n.message, n.created_at
     FROM notification_recipients nr
     INNER JOIN notifications n ON nr.notification_id = n.notification_id
     WHERE ${whereClause}
     ORDER BY nr.delivered_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset]
  );

  return { items: dataResult.rows, total };
}

/** Mark a single notification read for a student */
export async function markOneRead(
  notificationId: string,
  studentId: string
): Promise<boolean> {
  const result = await dbPool.query(
    `UPDATE notification_recipients
     SET is_read = TRUE, read_at = NOW()
     WHERE notification_id = $1 AND student_id = $2 AND is_read = FALSE`,
    [notificationId, studentId]
  );
  return (result.rowCount ?? 0) > 0;
}

/** Bulk mark notifications read for a student */
export async function markManyRead(
  notificationIds: string[],
  studentId: string
): Promise<number> {
  const result = await dbPool.query(
    `UPDATE notification_recipients
     SET is_read = TRUE, read_at = NOW()
     WHERE student_id = $1 AND notification_id = ANY($2::varchar[]) AND is_read = FALSE`,
    [studentId, notificationIds]
  );
  return result.rowCount ?? 0;
}

/** Mark ALL notifications read for a student */
export async function markAllRead(studentId: string): Promise<number> {
  const result = await dbPool.query(
    `UPDATE notification_recipients
     SET is_read = TRUE, read_at = NOW()
     WHERE student_id = $1 AND is_read = FALSE`,
    [studentId]
  );
  return result.rowCount ?? 0;
}

/** Get unread count for a student */
export async function getUnreadCount(studentId: string): Promise<number> {
  const result = await dbPool.query<{ count: string }>(
    `SELECT COUNT(*) FROM notification_recipients
     WHERE student_id = $1 AND is_read = FALSE`,
    [studentId]
  );
  return parseInt(result.rows[0].count, 10);
}
