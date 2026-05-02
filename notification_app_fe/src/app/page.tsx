// src/app/page.tsx — Priority Inbox page (Stage 6)
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { NavBar } from "@/components/NavBar";
import { NotificationCard } from "@/components/NotificationCard";
import { fetchPriorityInbox, fetchUnreadCount, markNotificationRead, ScoredNotification } from "@/lib/api";

export default function PriorityInboxPage() {
  const [notifications, setNotifications] = useState<ScoredNotification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isLoading, setIsLoading]         = useState(true);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);
  const [topK, setTopK]                   = useState(10);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [inbox, count] = await Promise.all([
        fetchPriorityInbox(topK),
        fetchUnreadCount(),
      ]);
      setNotifications(inbox);
      setUnreadCount(count);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load notifications";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, [topK]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleMarkRead(notifId: string) {
    try {
      await markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => n.notification_id === notifId ? { ...n, is_read: true } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently fail — UI still reflects optimistic update
    }
  }

  const placementCount = notifications.filter((n) => n.type === "Placement").length;
  const resultCount    = notifications.filter((n) => n.type === "Result").length;
  const eventCount     = notifications.filter((n) => n.type === "Event").length;

  return (
    <div className="app-shell">
      <NavBar unreadCount={unreadCount} />

      <main className="main-content" id="main-content" role="main">
        <header className="page-header">
          <h1 className="page-title">Priority Inbox</h1>
          <p className="page-subtitle">
            Top {topK} notifications ranked by type weight + recency · updated on each visit
          </p>
        </header>

        {/* Stats */}
        <div className="stats-row" role="region" aria-label="Notification statistics">
          <div className="stat-card">
            <div className="stat-value">{unreadCount}</div>
            <div className="stat-label">Unread Total</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--color-placement)" }}>{placementCount}</div>
            <div className="stat-label">Placements</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--color-result)" }}>{resultCount}</div>
            <div className="stat-label">Results</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "var(--color-event)" }}>{eventCount}</div>
            <div className="stat-label">Events</div>
          </div>
        </div>

        {/* Controls */}
        <div className="filter-bar" role="toolbar" aria-label="Top-K selector">
          {[5, 10, 15, 20].map((k) => (
            <button
              key={k}
              id={`topk-btn-${k}`}
              className={`filter-btn${topK === k ? " active" : ""}`}
              onClick={() => setTopK(k)}
              aria-pressed={topK === k}
            >
              Top {k}
            </button>
          ))}
          <button
            id="refresh-btn"
            className="filter-btn"
            onClick={loadData}
            aria-label="Refresh notifications"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="error-banner" role="alert">
            ⚠ {errorMsg}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="loading-wrap" aria-live="polite" aria-label="Loading">
            <div className="spinner" aria-hidden="true" />
            <span>Computing priority inbox…</span>
          </div>
        )}

        {/* Notification list */}
        {!isLoading && !errorMsg && (
          <section aria-label="Priority notifications">
            <div className="section-label">
              <h2>Top {notifications.length} by Priority Score</h2>
              <div className="section-divider" />
            </div>

            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <p className="empty-title">All caught up!</p>
                <p className="empty-desc">No notifications to display.</p>
              </div>
            ) : (
              <ol style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {notifications.map((notif, idx) => (
                  <li key={notif.notification_id} style={{ animationDelay: `${idx * 40}ms` }}>
                    <NotificationCard
                      notification={notif}
                      rank={idx + 1}
                      onMarkRead={handleMarkRead}
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
