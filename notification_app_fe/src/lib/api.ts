// src/lib/api.ts — API client for backend communication

const BE_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api/v1";
const STUDENT_ID = "stu-demo-0001";

export interface ScoredNotification {
  notification_id: string;
  type: "Placement" | "Result" | "Event";
  message: string;
  is_read: boolean;
  created_at: string;
  priority_score: number;
  type_weight: number;
  recency_factor: number;
}

export interface FeedNotification {
  notification_id: string;
  type: "Placement" | "Result" | "Event";
  message: string;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string;
  created_at: string;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BE_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "API error");
  return json.data as T;
}

export async function fetchPriorityInbox(limit = 10): Promise<ScoredNotification[]> {
  const data = await apiFetch<{ notifications: ScoredNotification[] }>(
    `/notifications/priority-inbox?limit=${limit}`
  );
  return data.notifications;
}

export async function fetchNotificationFeed(
  page = 1,
  limit = 20,
  type?: string,
  isRead?: boolean
): Promise<{ notifications: FeedNotification[]; pagination: PaginationMeta }> {
  const params = new URLSearchParams({
    studentId: STUDENT_ID,
    page: String(page),
    limit: String(limit),
  });
  if (type) params.set("type", type);
  if (isRead !== undefined) params.set("isRead", String(isRead));

  const data = await apiFetch<{ items: FeedNotification[]; pagination: PaginationMeta }>(
    `/notifications?${params}`
  );
  return { notifications: data.items, pagination: data.pagination };
}

export async function fetchUnreadCount(): Promise<number> {
  const data = await apiFetch<{ unreadCount: number }>(
    `/notifications/unread-count?studentId=${STUDENT_ID}`
  );
  return data.unreadCount;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiFetch(`/notifications/${notificationId}/read?studentId=${STUDENT_ID}`, {
    method: "PATCH",
  });
}
