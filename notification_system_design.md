# Notification System Design

**Author:** Dhanush Adi | Roll No: RA2311003020344  
**Platform:** Campus Notifications — Affordmed Hiring Evaluation

---

## Stage 1

### REST API Contract

Base URL: `/api/v1` | Auth: `Authorization: Bearer <jwt_token>`

#### Endpoints

**POST `/api/v1/notifications`** — Create notification
```json
// Request
{ "type": "Placement", "message": "Google drive on June 10", "targetStudentIds": ["stu_001"], "broadcastToAll": false }
// Response 201
{ "success": true, "data": { "notificationId": "notif_7a3f91bc", "type": "Placement", "createdAt": "2026-05-02T05:10:00Z", "recipientCount": 1 } }
```

**GET `/api/v1/notifications?page=1&limit=20&type=Placement&isRead=false`** — Fetch feed
```json
// Response 200
{
  "success": true,
  "data": {
    "notifications": [{ "notificationId": "notif_7a3f91bc", "type": "Placement", "message": "Google drive", "isRead": false, "createdAt": "2026-05-02T05:10:00Z", "priorityScore": 3.98 }],
    "pagination": { "currentPage": 1, "totalPages": 12, "totalItems": 234, "hasNextPage": true }
  }
}
```

**PATCH `/api/v1/notifications/:notificationId/read`** — Mark single read
```json
// Response 200
{ "success": true, "data": { "notificationId": "notif_7a3f91bc", "isRead": true, "readAt": "2026-05-02T06:20:00Z" } }
```

**PATCH `/api/v1/notifications/bulk-read`** — Bulk mark read
```json
// Request
{ "notificationIds": ["notif_7a3f91bc", "notif_2b9d44ef"], "markAllRead": false }
// Response 200
{ "success": true, "data": { "updatedCount": 2 } }
```

**GET `/api/v1/notifications/unread-count`** — Badge count
```json
{ "success": true, "data": { "unreadCount": 14 } }
```

**GET `/api/v1/notifications/priority-inbox?limit=10`** — Priority inbox
```json
{ "success": true, "data": { "notifications": [{ "notificationId": "notif_7a3f91bc", "type": "Placement", "message": "Google drive", "priorityScore": 3.99, "isRead": false }] } }
```

#### JSON Schema (Create Notification)
```json
{
  "type": "object",
  "required": ["type", "message"],
  "properties": {
    "type": { "type": "string", "enum": ["Event", "Result", "Placement"] },
    "message": { "type": "string", "maxLength": 500 },
    "targetStudentIds": { "type": "array", "items": { "type": "string" } },
    "broadcastToAll": { "type": "boolean", "default": false }
  }
}
```

#### Real-Time Mechanism: WebSocket (Socket.io)

Connection: `ws://host/socket.io?token=<jwt>`

| Event | Direction | Payload |
|-------|-----------|---------|
| `notification:new` | Server → Client | `{ notificationId, type, message, createdAt }` |
| `notification:read_ack` | Client → Server | `{ notificationId }` |
| `notification:unread_count` | Server → Client | `{ count: 14 }` |

Flow: Student connects → joins room `student:<studentId>` → admin creates notification → server emits `notification:new` to target rooms. Fallback: poll `GET /unread-count` every 30s if WebSocket unavailable.

---

## Stage 2

### Database Design

**Choice: PostgreSQL**

Rationale: ACID compliance for atomic bulk-read operations, native composite indexes on `(studentId, isRead, createdAt)`, complex SQL sorting for priority inbox, JOIN efficiency for many-to-many student↔notification, JSONB for metadata. At 50K students and 5M notifications, PostgreSQL with proper indexing and read replicas scales comfortably.

#### Schema

```sql
CREATE TABLE students (
  student_id   VARCHAR(36) PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  roll_number  VARCHAR(50) UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE notification_category AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE notifications (
  notification_id  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  type             notification_category NOT NULL,
  message          TEXT NOT NULL,
  created_by       VARCHAR(36),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_recipients (
  recipient_id     BIGSERIAL PRIMARY KEY,
  notification_id  VARCHAR(36) NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
  student_id       VARCHAR(36) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  is_read          BOOLEAN DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notification_id, student_id)
);
```

#### Indexing Strategy

```sql
-- Primary lookup: unread notifications for a student, sorted by recency
CREATE INDEX idx_recipients_student_unread
  ON notification_recipients (student_id, is_read, delivered_at DESC);

-- Used by priority inbox: filter by type
CREATE INDEX idx_notifications_type_created
  ON notifications (type, created_at DESC);

-- Covering index: avoid heap fetch for unread count
CREATE INDEX idx_recipients_covering
  ON notification_recipients (student_id, is_read)
  INCLUDE (notification_id, delivered_at);
```

Scale consideration: Partition `notification_recipients` by month. Archive read notifications older than 90 days to `notification_archive`.

#### Query Examples

```sql
-- Fetch unread feed (paginated)
SELECT nr.notification_id, nr.is_read, nr.delivered_at, n.type, n.message, n.created_at
FROM notification_recipients nr
INNER JOIN notifications n ON nr.notification_id = n.notification_id
WHERE nr.student_id = 'stu_001' AND nr.is_read = FALSE
ORDER BY nr.delivered_at DESC LIMIT 20 OFFSET 0;

-- Unread count
SELECT COUNT(*) FROM notification_recipients
WHERE student_id = 'stu_001' AND is_read = FALSE;

-- Bulk mark read
UPDATE notification_recipients
SET is_read = TRUE, read_at = NOW()
WHERE student_id = 'stu_001' AND notification_id = ANY($1::varchar[]) AND is_read = FALSE;
```

---

## Stage 3

### Query Analysis and Optimization

#### Query Under Review
```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt DESC;
```

#### Performance Issues at Scale

1. **`SELECT *`** — fetches all columns including large text blobs; wastes I/O. Prevents index-only scans.
2. **No composite index** on `(studentID, isRead, createdAt)` — forces sequential scan or inefficient partial scan.
3. **`ORDER BY createdAt DESC` without matching index order** — triggers in-memory filesort for each query.
4. **No `LIMIT`** — returns full unbounded unread set; a student inactive for a month returns hundreds of rows per page load.
5. **Low-cardinality `isRead` column alone** is a poor standalone index candidate (matches ~50% of rows).

#### Index Recommendation

```sql
CREATE INDEX idx_notif_recipients_priority_lookup
  ON notification_recipients (student_id, is_read, delivered_at DESC)
  INCLUDE (notification_id);
```

Justification: `student_id` leftmost enables equality filter; `is_read` prunes read rows immediately; `delivered_at DESC` matches ORDER BY (no post-sort); `INCLUDE` enables index-only scan.

#### Advice on Indexing Every Column

**Not effective.** Every index adds write overhead on INSERT/UPDATE/DELETE. Boolean columns like `is_read` have near-zero selectivity as standalone indexes. The query planner ignores poor-selectivity indexes and falls back to full scans. Use composite indexes that exactly match actual query patterns.

#### Rewritten Query — Placement Notifications, Last 7 Days

```sql
SELECT
  nr.notification_id,
  n.type             AS notification_type,
  n.message,
  n.created_at,
  nr.is_read,
  nr.delivered_at
FROM notification_recipients nr
INNER JOIN notifications n ON nr.notification_id = n.notification_id
WHERE nr.student_id = 1042
  AND nr.is_read = FALSE
  AND n.type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC
LIMIT 50;
```

Improvements: explicit columns, `LIMIT 50`, type and recency filter at index level, leverages both composite indexes via nested-loop join.

---

## Stage 4

### Caching Strategy and Architecture Improvements

#### Root Cause

Every page load fires an unbounded `SELECT` on 5M rows. 50K concurrent students = 50K simultaneous queries. No caching, no connection pooling, no pagination enforcement.

#### Solution 1: Redis Caching Layer

| Cache Key | TTL | Value |
|-----------|-----|-------|
| `unread_count:<studentId>` | 60s | integer |
| `feed:<studentId>:p:<n>` | 30s | JSON notification array |
| `priority_inbox:<studentId>` | 120s | top-10 JSON array |

Invalidation: On new notification delivery or read-mark → `DEL unread_count:<studentId>` + `DEL feed:<studentId>:*`.

Tradeoffs: ✅ 80-90% DB read reduction | ❌ 60s eventual consistency on counts (acceptable) | ❌ ~25MB memory for 50K students (trivial) | ❌ Cache cold-start after Redis restart.

#### Solution 2: Partial Indexes

```sql
CREATE INDEX idx_unread_only ON notification_recipients (student_id, delivered_at DESC)
WHERE is_read = FALSE;
```

Index only stores unread rows — dramatically smaller and faster. Automatically shrinks as notifications are read.

#### Solution 3: Architecture

- **PgBouncer** (transaction mode): multiplexes app connections; prevents exhausting PostgreSQL's connection limit under 50K users.
- **Read replicas**: all reads (feed, count, inbox) → replica; writes (mark read, new notification) → primary. Linear read scale-out.
- **Pre-computation cron**: every 5 minutes warm Redis cache for most-active students. Near-instant responses on app open.
- **Enforce `LIMIT`**: never return unbounded result sets. Use cursor-based pagination for infinite scroll.

| Strategy | Cost | Benefit |
|----------|------|---------|
| Redis cache | Low memory | ~80% read reduction |
| Partial index | Low storage | 3-5x faster unread queries |
| Read replica | Medium infra | Linear read scale-out |
| PgBouncer | Low config | 10x connection efficiency |
| Pre-computation | Low periodic CPU | Near-zero latency |

---

## Stage 5

### Bulk Notification Redesign

#### Shortcomings of Naive Implementation

```python
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

1. **Serial = 42 minutes** — 50K × ~50ms per student = unacceptable latency.
2. **No fault isolation** — email #200 fails → entire loop halts; students 201–50K get nothing.
3. **No atomicity per student** — email succeeds but DB fails → inconsistent state.
4. **No retry logic** — failed operations are lost permanently.
5. **Rate limit risk** — 50K rapid external email API calls triggers provider throttling/blocks.

#### Redesigned Queue-Based Approach

```typescript
async function notify_all(student_ids: string[], message: string): Promise<void> {
  const batch_id = generate_uuid();
  Log("backend", "info", "service", `Bulk notify: batch=${batch_id}, count=${student_ids.length}`);

  // Save notification record once (not per student)
  const notification_id = await save_notification_to_db(message, batch_id);

  // Chunk into 500 and enqueue — non-blocking
  const chunks = split_into_chunks(student_ids, 500);
  for (const chunk of chunks) {
    await notification_queue.add_batch(chunk.map(student_id => ({
      payload: { student_id, notification_id, message, batch_id },
      options: { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    })));
  }
}

// Worker (runs in parallel, N instances)
async function process_notify_job(job): Promise<void> {
  const { student_id, notification_id, message, batch_id } = job.payload;
  try {
    await upsert_recipient(notification_id, student_id);  // idempotent DB write first
    await send_email_with_timeout(student_id, message, 5000);
    await push_to_app(student_id, notification_id);
    Log("backend", "info", "service", `OK: student=${student_id} batch=${batch_id}`);
  } catch (err) {
    Log("backend", "error", "service", `FAIL: student=${student_id} err=${err.message}`);
    throw err; // framework retries with exponential backoff
  }
}

// Dead letter queue — after all retries exhausted
async function handle_dlq(job, error): Promise<void> {
  Log("backend", "fatal", "service", `DLQ: student=${job.payload.student_id}`);
  await save_to_dead_letter_table(job.payload, error.message);
}
```

#### Should Email/DB/Push Happen Together?

**No — decouple them with DB as source of truth.**

Email sending is an external HTTP call. DB transactions cannot span external calls — holding a DB connection while waiting on email API (potentially 5-30s timeout) blocks other operations and exhausts the connection pool.

Correct order: **DB first → Email (async, retriable) → Push (fire-and-forget)**

- DB write is atomic and is the ground truth. If email fails, the record exists for retry.
- Email delivery is inherently async (email servers queue internally). A failed email goes to DLQ for retry.
- Push is best-effort — offline students get the notification from DB on next login.

This achieves reliable delivery + eventual email consistency + real-time push when possible, without blocking DB connections on external API calls.

---

## Stage 6

### Priority Inbox — Top 10 by Weight

#### Algorithm Design

Score formula: `priorityScore = typeWeight + recencyFactor`
- `typeWeight`: Placement=3, Result=2, Event=1
- `recencyFactor = 1 / (hoursElapsed + 1)` — ranges 0→1, decays with age

A new Placement scores ~4.0; a week-old Event scores ~1.006. Recent Events can outrank stale Results.

#### Efficient Data Structure: Min-Heap of Size K

Runtime: **O(n log k)** where n=total notifications, k=10. Avoids sorting the full list.

For each new notification:
1. Compute `priorityScore`
2. If heap size < 10 → push
3. If heap[min] < new score → pop min, push new

**Maintaining top-10 as new notifications arrive:** Each new notification is evaluated in O(log 10) = O(1) effectively. The heap always contains the current top-10 without re-processing the full list.

See `stage6_priority_inbox.ts` for complete working implementation with actual API integration.
