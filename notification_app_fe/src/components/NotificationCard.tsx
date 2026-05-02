// src/components/NotificationCard.tsx — Reusable notification card component
"use client";

import React from "react";
import { ScoredNotification, FeedNotification } from "@/lib/api";

type CardNotification = ScoredNotification | FeedNotification;

interface NotificationCardProps {
  notification: CardNotification;
  rank?: number;
  onMarkRead?: (id: string) => void;
}

function isPriority(n: CardNotification): n is ScoredNotification {
  return "priority_score" in n;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

function getRankClass(rank?: number): string {
  if (!rank) return "";
  if (rank === 1) return "rank-1";
  if (rank === 2) return "rank-2";
  if (rank === 3) return "rank-3";
  return "rank-other";
}

export function NotificationCard({ notification, rank, onMarkRead }: NotificationCardProps) {
  const scored = isPriority(notification);
  const timestamp = scored
    ? (notification as ScoredNotification).created_at
    : (notification as FeedNotification).delivered_at;

  function handleClick() {
    if (onMarkRead) onMarkRead(notification.notification_id);
  }

  return (
    <div
      className={`notif-card type-${notification.type}${scored ? " is-priority" : ""}${!notification.is_read ? " unread" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${notification.type} notification: ${notification.message}`}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {rank !== undefined && (
        <div className={`rank-badge ${getRankClass(rank)}`} aria-label={`Rank ${rank}`}>
          {rank}
        </div>
      )}

      <div className="notif-body">
        <div className="notif-meta">
          <span className={`notif-type-badge ${notification.type}`}>
            {notification.type}
          </span>
          {scored && (
            <span className="notif-score">
              Score: <span>{(notification as ScoredNotification).priority_score.toFixed(4)}</span>
            </span>
          )}
          {!notification.is_read && (
            <span className="badge-unread" aria-label="Unread">New</span>
          )}
        </div>
        <p className="notif-message">{notification.message}</p>
        <span className="notif-time">{formatRelativeTime(timestamp)}</span>
      </div>
    </div>
  );
}
