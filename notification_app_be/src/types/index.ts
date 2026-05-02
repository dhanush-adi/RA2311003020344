// src/types/index.ts — Shared TypeScript interfaces for the backend

/** Notification category enum matching the evaluation API */
export type NotificationCategory = "Event" | "Result" | "Placement";

/** A notification record stored in the DB */
export interface NotificationRecord {
  notification_id: string;
  type: NotificationCategory;
  message: string;
  created_by: string | null;
  created_at: Date;
}

/** Per-student delivery record */
export interface RecipientRecord {
  recipient_id: number;
  notification_id: string;
  student_id: string;
  is_read: boolean;
  read_at: Date | null;
  delivered_at: Date;
}

/** Joined view used in API responses */
export interface NotificationFeedItem {
  notification_id: string;
  type: NotificationCategory;
  message: string;
  is_read: boolean;
  read_at: Date | null;
  delivered_at: Date;
  created_at: Date;
  priority_score?: number;
}

/** Scored notification for priority inbox */
export interface ScoredNotification {
  notification_id: string;
  type: NotificationCategory;
  message: string;
  is_read: boolean;
  created_at: Date | string;
  priority_score: number;
  type_weight: number;
  recency_factor: number;
}

/** Raw notification shape from evaluation API */
export interface EvalNotification {
  ID: string;
  Type: NotificationCategory;
  Message: string;
  Timestamp: string;
}

/** Depot shape from evaluation API */
export interface EvalDepot {
  ID: number;
  MechanicHours: number;
}

/** Vehicle/task shape from evaluation API */
export interface EvalVehicle {
  TaskID: string;
  Duration: number;
  Impact: number;
}

/** Result of the knapsack scheduling algorithm per depot */
export interface DepotScheduleResult {
  depotId: number;
  mechanicHoursAvailable: number;
  hoursUsed: number;
  totalImpact: number;
  scheduledTasks: EvalVehicle[];
}

/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Pagination metadata */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
}
