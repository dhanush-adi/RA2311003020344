// src/services/priorityInboxService.ts — Min-heap based priority inbox (O(n log k))
// Stage 6 implementation: typeWeight + recencyFactor scoring

import axios from "axios";
import { ScoredNotification, EvalNotification, NotificationCategory } from "../types";
import { createLogger } from "../../../logging_middleware/src";

const svcLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

const WEIGHT_BY_TYPE: Record<NotificationCategory, number> = {
  Placement: 3,
  Result:    2,
  Event:     1,
};

function calcHoursElapsed(timestampStr: string): number {
  const notifMs = new Date(timestampStr.replace(" ", "T") + "Z").getTime();
  const nowMs   = Date.now();
  return Math.max(0, (nowMs - notifMs) / 3_600_000);
}

function scoreSingleNotification(raw: EvalNotification): ScoredNotification {
  const typeWeight    = WEIGHT_BY_TYPE[raw.Type] ?? 1;
  const hoursElapsed  = calcHoursElapsed(raw.Timestamp);
  const recencyFactor = 1 / (hoursElapsed + 1);
  return {
    notification_id: raw.ID,
    type:            raw.Type,
    message:         raw.Message,
    is_read:         false,
    created_at:      raw.Timestamp,
    type_weight:     typeWeight,
    recency_factor:  parseFloat(recencyFactor.toFixed(6)),
    priority_score:  parseFloat((typeWeight + recencyFactor).toFixed(4)),
  };
}

// ── Min-Heap (size-bounded) ──────────────────────────────────────────────────

function heapBubbleUp(heap: ScoredNotification[], startIdx: number): void {
  let idx = startIdx;
  while (idx > 0) {
    const parentIdx = Math.floor((idx - 1) / 2);
    if (heap[parentIdx].priority_score <= heap[idx].priority_score) break;
    [heap[parentIdx], heap[idx]] = [heap[idx], heap[parentIdx]];
    idx = parentIdx;
  }
}

function heapSinkDown(heap: ScoredNotification[], startIdx: number): void {
  const size = heap.length;
  let idx = startIdx;
  while (true) {
    let smallest = idx;
    const left   = 2 * idx + 1;
    const right  = 2 * idx + 2;
    if (left  < size && heap[left].priority_score  < heap[smallest].priority_score) smallest = left;
    if (right < size && heap[right].priority_score < heap[smallest].priority_score) smallest = right;
    if (smallest === idx) break;
    [heap[smallest], heap[idx]] = [heap[idx], heap[smallest]];
    idx = smallest;
  }
}

function heapPush(heap: ScoredNotification[], item: ScoredNotification): void {
  heap.push(item);
  heapBubbleUp(heap, heap.length - 1);
}

function heapPop(heap: ScoredNotification[]): ScoredNotification {
  const topItem = heap[0];
  const lastItem = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = lastItem;
    heapSinkDown(heap, 0);
  }
  return topItem;
}

/**
 * Extract top-K notifications using a size-bounded min-heap.
 * Time: O(n log k) | Space: O(k)
 */
function extractTopK(
  notifications: EvalNotification[],
  k: number
): ScoredNotification[] {
  const minHeap: ScoredNotification[] = [];

  for (const raw of notifications) {
    const scored = scoreSingleNotification(raw);
    if (minHeap.length < k) {
      heapPush(minHeap, scored);
    } else if (scored.priority_score > minHeap[0].priority_score) {
      heapPop(minHeap);
      heapPush(minHeap, scored);
    }
  }

  // Drain heap and reverse to get descending order
  const ranked: ScoredNotification[] = [];
  while (minHeap.length > 0) ranked.push(heapPop(minHeap));
  return ranked.reverse();
}

/** Fetch from evaluation API and return top-k priority notifications */
export async function getPriorityInbox(topK: number = 10): Promise<ScoredNotification[]> {
  const authToken = process.env.EVAL_AUTH_TOKEN ?? "";
  const apiBase   = process.env.EVAL_API_BASE   ?? "http://20.207.122.201/evaluation-service";

  svcLogger.info("service", `Fetching notifications from eval API for priority inbox (k=${topK})`);

  const response = await axios.get<{ notifications: EvalNotification[] }>(
    `${apiBase}/notifications`,
    { headers: { Authorization: `Bearer ${authToken}` }, timeout: 8000 }
  );

  const allNotifications = response.data.notifications;
  svcLogger.info("service", `Received ${allNotifications.length} notifications from eval API`);

  const topNotifications = extractTopK(allNotifications, topK);
  svcLogger.info("service", `Priority inbox computed: top ${topNotifications.length} notifications returned`);

  return topNotifications;
}
