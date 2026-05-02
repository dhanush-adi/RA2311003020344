// stage6_priority_inbox.ts
// Stage 6: Priority Inbox — Top 10 unread notifications by weight formula
// Priority = typeWeight (Placement=3, Result=2, Event=1) + recencyFactor (1/(hours+1))
// Algorithm: size-bounded min-heap, O(n log k) time, O(k) space

import * as dotenv from "dotenv";
dotenv.config();

interface RawNotification {
  ID: string;
  Type: "Placement" | "Result" | "Event";
  Message: string;
  Timestamp: string;
}

interface ScoredNotification extends RawNotification {
  priorityScore:  number;
  typeWeight:     number;
  recencyFactor:  number;
  hoursAge:       number;
}

const TYPE_WEIGHT_TABLE: Record<string, number> = {
  Placement: 3,
  Result:    2,
  Event:     1,
};

function calcHoursOld(ts: string): number {
  const notifMs = new Date(ts.replace(" ", "T") + "Z").getTime();
  return Math.max(0, (Date.now() - notifMs) / 3_600_000);
}

function buildScoredEntry(raw: RawNotification): ScoredNotification {
  const typeWeight    = TYPE_WEIGHT_TABLE[raw.Type] ?? 1;
  const hoursAge      = calcHoursOld(raw.Timestamp);
  const recencyFactor = 1 / (hoursAge + 1);
  return {
    ...raw,
    typeWeight,
    recencyFactor:  parseFloat(recencyFactor.toFixed(6)),
    hoursAge:       parseFloat(hoursAge.toFixed(2)),
    priorityScore:  parseFloat((typeWeight + recencyFactor).toFixed(4)),
  };
}

// ── Min-Heap (manually implemented, no libraries) ───────────────────────────

function riseUp(heap: ScoredNotification[], pos: number): void {
  while (pos > 0) {
    const parent = Math.floor((pos - 1) / 2);
    if (heap[parent].priorityScore <= heap[pos].priorityScore) break;
    [heap[parent], heap[pos]] = [heap[pos], heap[parent]];
    pos = parent;
  }
}

function fallDown(heap: ScoredNotification[], pos: number): void {
  const size = heap.length;
  while (true) {
    let least = pos;
    const lc  = 2 * pos + 1;
    const rc  = 2 * pos + 2;
    if (lc < size && heap[lc].priorityScore < heap[least].priorityScore) least = lc;
    if (rc < size && heap[rc].priorityScore < heap[least].priorityScore) least = rc;
    if (least === pos) break;
    [heap[least], heap[pos]] = [heap[pos], heap[least]];
    pos = least;
  }
}

function pushItem(heap: ScoredNotification[], item: ScoredNotification): void {
  heap.push(item);
  riseUp(heap, heap.length - 1);
}

function popMin(heap: ScoredNotification[]): ScoredNotification {
  const minItem  = heap[0];
  const tailItem = heap.pop()!;
  if (heap.length > 0) { heap[0] = tailItem; fallDown(heap, 0); }
  return minItem;
}

function extractTopKNotifications(
  rawList: RawNotification[],
  k: number
): ScoredNotification[] {
  const boundedHeap: ScoredNotification[] = [];

  for (const rawItem of rawList) {
    const scored = buildScoredEntry(rawItem);
    if (boundedHeap.length < k) {
      pushItem(boundedHeap, scored);
    } else if (scored.priorityScore > boundedHeap[0].priorityScore) {
      popMin(boundedHeap);
      pushItem(boundedHeap, scored);
    }
  }

  const orderedResult: ScoredNotification[] = [];
  while (boundedHeap.length > 0) orderedResult.push(popMin(boundedHeap));
  return orderedResult.reverse(); // highest score first
}

async function runPriorityInbox(): Promise<void> {
  const evalToken = process.env.EVAL_AUTH_TOKEN ?? "";
  const evalBase  = process.env.EVAL_API_BASE   ?? "http://20.207.122.201/evaluation-service";

  if (!evalToken) {
    console.error("ERROR: Set EVAL_AUTH_TOKEN in .env before running");
    process.exit(1);
  }

  console.log("Fetching notifications from Affordmed evaluation API...\n");

  const resp = await fetch(`${evalBase}/notifications`, {
    headers: { Authorization: `Bearer ${evalToken}` },
  });

  if (!resp.ok) throw new Error(`API responded ${resp.status}: ${resp.statusText}`);

  const body = (await resp.json()) as { notifications: RawNotification[] };
  const total = body.notifications.length;
  console.log(`Received ${total} notifications.\n`);

  const topTen = extractTopKNotifications(body.notifications, 10);

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║           TOP 10 PRIORITY INBOX — CAMPUS NOTIFICATIONS       ║");
  console.log("╠════╦════════════╦════════╦════════╦══════════════════════════╣");
  console.log("║ #  ║ Type       ║ Score  ║Age(hr) ║ Message                  ║");
  console.log("╠════╬════════════╬════════╬════════╬══════════════════════════╣");

  topTen.forEach((n, idx) => {
    const rank  = String(idx + 1).padStart(2);
    const type  = n.Type.padEnd(10);
    const score = n.priorityScore.toFixed(4).padStart(6);
    const age   = n.hoursAge.toFixed(2).padStart(6);
    const msg   = n.Message.substring(0, 24).padEnd(24);
    console.log(`║ ${rank} ║ ${type} ║ ${score} ║ ${age} ║ ${msg} ║`);
  });

  console.log("╚════╩════════════╩════════╩════════╩══════════════════════════╝\n");
  console.log("Full JSON output:\n");
  console.log(JSON.stringify(topTen, null, 2));
}

runPriorityInbox().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
