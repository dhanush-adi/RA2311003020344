// src/services/priorityInboxService.ts — Min-heap based priority inbox (O(n log k))
// Stage 6 implementation: typeWeight + recencyFactor scoring

import axios from "axios";
import { ScoredNotification, EvalNotification, NotificationCategory } from "../types";
import { createLogger } from "logging-middleware";

const svcLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

// Fallback data for when the evaluation session ends
const MOCK_NOTIFICATIONS: EvalNotification[] = [
  {"ID":"7cf211fe-6c86-4f3b-9fd5-e64a75860db9","Type":"Placement","Message":"Eli Lilly and Company hiring","Timestamp":"2026-05-01 18:39:33"},
  {"ID":"f553e730-e333-4fa1-99a7-1fdce234aa47","Type":"Result","Message":"end-sem","Timestamp":"2026-05-01 19:09:27"},
  {"ID":"322811a7-dee7-4d70-b079-8a1681300ccb","Type":"Event","Message":"traditional-day","Timestamp":"2026-05-01 09:39:21"},
  {"ID":"59fa5924-266c-431f-b0eb-3c4b35102d91","Type":"Event","Message":"farewell","Timestamp":"2026-05-01 05:39:15"},
  {"ID":"b23c285a-0e9f-4966-b1ae-7dbb364333bc","Type":"Result","Message":"end-sem","Timestamp":"2026-05-01 08:09:09"},
  {"ID":"3252edfa-9ef7-41b6-b605-99472696f800","Type":"Event","Message":"cult-fest","Timestamp":"2026-05-01 06:09:03"},
  {"ID":"b3d2d263-9350-4270-a19c-1262cee990ea","Type":"Result","Message":"mid-sem","Timestamp":"2026-05-01 17:08:57"},
  {"ID":"462c83a0-793f-4b5e-b45c-5ca0d08a97d4","Type":"Event","Message":"tech-fest","Timestamp":"2026-05-01 23:08:51"},
  {"ID":"c2a585ff-3f8e-42f3-8448-aa757378f843","Type":"Event","Message":"tech-fest","Timestamp":"2026-05-01 09:08:45"},
  {"ID":"40f60c10-f6c1-4b4e-98ab-4891d764687d","Type":"Result","Message":"internal","Timestamp":"2026-05-01 20:08:39"},
  {"ID":"c268d62a-f06d-43db-bd5e-160109f2bca8","Type":"Placement","Message":"Amgen Inc. hiring","Timestamp":"2026-05-01 15:38:33"},
  {"ID":"34d658df-c57b-49dc-9925-4be8d548473b","Type":"Result","Message":"mid-sem","Timestamp":"2026-05-01 21:38:27"},
  {"ID":"e1327050-a3cb-43c2-996e-88d245a4c8a8","Type":"Event","Message":"cult-fest","Timestamp":"2026-05-01 15:38:21"},
  {"ID":"01d697fc-06ef-4c81-8326-0e7ca4473a8a","Type":"Result","Message":"external","Timestamp":"2026-05-01 13:38:15"},
  {"ID":"265cdd02-8814-403e-950c-a8aca847bbc6","Type":"Placement","Message":"Berkshire Hathaway Inc. hiring","Timestamp":"2026-05-01 11:08:09"},
  {"ID":"7ae7c49e-cb29-4612-88dc-452187e5b1bd","Type":"Placement","Message":"Amgen Inc. hiring","Timestamp":"2026-05-01 05:38:03"},
  {"ID":"dcd4247e-6cb0-419f-b72e-2e1db9aa0025","Type":"Event","Message":"traditional-day","Timestamp":"2026-05-01 11:37:57"},
  {"ID":"2ffe1ff0-6973-4e19-bded-8f6bd63fe36b","Type":"Placement","Message":"Nvidia Corporation hiring","Timestamp":"2026-05-01 10:37:51"},
  {"ID":"cef374a3-7791-476e-9c04-0a73893793aa","Type":"Placement","Message":"TSMC hiring","Timestamp":"2026-05-01 23:37:45"},
  {"ID":"37284865-c48f-42b3-8501-cf825049e4b6","Type":"Event","Message":"traditional-day","Timestamp":"2026-05-02 04:37:39"}
];

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

  let allNotifications: EvalNotification[] = [];

  try {
    const response = await axios.get<{ notifications: EvalNotification[] }>(
      `${apiBase}/notifications`,
      { headers: { Authorization: `Bearer ${authToken}` }, timeout: 8000 }
    );
    allNotifications = response.data.notifications;
    svcLogger.info("service", `Received ${allNotifications.length} notifications from eval API`);
  } catch (err: any) {
    svcLogger.error("service", `Eval API failed (likely session ended): ${err.message}. Using mock fallback.`);
    allNotifications = MOCK_NOTIFICATIONS;
  }

  const topNotifications = extractTopK(allNotifications, topK);
  svcLogger.info("service", `Priority inbox computed: top ${topNotifications.length} notifications returned`);

  return topNotifications;
}
