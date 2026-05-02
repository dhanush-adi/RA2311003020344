// src/app/feed/page.tsx — All Notifications feed page
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { NavBar } from "@/components/NavBar";
import { NotificationCard } from "@/components/NotificationCard";
import { fetchNotificationFeed, fetchUnreadCount, markNotificationRead, FeedNotification, PaginationMeta } from "@/lib/api";

const TYPE_FILTERS = ["All", "Placement", "Result", "Event"] as const;
type TypeFilter = typeof TYPE_FILTERS[number];

export default function FeedPage() {
  const [notifications, setNotifications] = useState<FeedNotification[]>([]);
  const [pagination, setPagination]       = useState<PaginationMeta | null>(null);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [activeType, setActiveType]       = useState<TypeFilter>("All");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage]                   = useState(1);
  const [isLoading, setIsLoading]         = useState(true);
  const [errorMsg, setErrorMsg]           = useState<string | null>(null);

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const typeArg    = activeType !== "All" ? activeType : undefined;
      const isReadArg  = showUnreadOnly ? false : undefined;
      const [feed, cnt] = await Promise.all([
        fetchNotificationFeed(page, 20, typeArg, isReadArg),
        fetchUnreadCount(),
      ]);
      setNotifications(feed.notifications);
      setPagination(feed.pagination);
      setUnreadCount(cnt);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setIsLoading(false);
    }
  }, [page, activeType, showUnreadOnly]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  function handleTypeFilter(t: TypeFilter) {
    setActiveType(t);
    setPage(1);
  }

  async function handleMarkRead(notifId: string) {
    try {
      await markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => n.notification_id === notifId ? { ...n, is_read: true } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent fail */ }
  }

  return (
    <div className="app-shell">
      <NavBar unreadCount={unreadCount} />

      <main className="main-content" id="feed-content" role="main">
        <header className="page-header">
          <h1 className="page-title">All Notifications</h1>
          <p className="page-subtitle">Browse your complete notification history · {pagination?.totalItems ?? 0} total</p>
        </header>

        {/* Type filter bar */}
        <div className="filter-bar" role="toolbar" aria-label="Filter by type">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              id={`filter-${t.toLowerCase()}`}
              className={`filter-btn${activeType === t ? " active" : ""}`}
              onClick={() => handleTypeFilter(t)}
              aria-pressed={activeType === t}
            >
              {t}
            </button>
          ))}
          <button
            id="unread-toggle"
            className={`filter-btn${showUnreadOnly ? " active" : ""}`}
            onClick={() => { setShowUnreadOnly(!showUnreadOnly); setPage(1); }}
            aria-pressed={showUnreadOnly}
          >
            Unread only
          </button>
        </div>

        {errorMsg && <div className="error-banner" role="alert">⚠ {errorMsg}</div>}

        {isLoading ? (
          <div className="loading-wrap" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
            <span>Loading notifications…</span>
          </div>
        ) : (
          <section aria-label="Notification feed">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p className="empty-title">No notifications found</p>
                <p className="empty-desc">Try changing the filters above.</p>
              </div>
            ) : (
              <>
                <ol style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {notifications.map((notif, idx) => (
                    <li key={notif.notification_id} style={{ animationDelay: `${idx * 30}ms` }}>
                      <NotificationCard notification={notif} onMarkRead={handleMarkRead} />
                    </li>
                  ))}
                </ol>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div
                    style={{
                      display: "flex", gap: "var(--space-3)",
                      justifyContent: "center", marginTop: "var(--space-8)",
                      alignItems: "center",
                    }}
                    role="navigation"
                    aria-label="Pagination"
                  >
                    <button
                      id="prev-page-btn"
                      className="filter-btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="Previous page"
                    >
                      ← Prev
                    </button>
                    <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      id="next-page-btn"
                      className="filter-btn"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!pagination.hasNextPage}
                      aria-label="Next page"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
