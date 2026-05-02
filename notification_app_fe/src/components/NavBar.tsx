// src/components/NavBar.tsx — Top navigation bar
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavBarProps {
  unreadCount?: number;
}

export function NavBar({ unreadCount = 0 }: NavBarProps) {
  const pathname = usePathname();

  return (
    <nav className="nav-bar" role="navigation" aria-label="Main navigation">
      <div className="nav-brand">
        <div className="nav-brand-icon" aria-hidden="true">🔔</div>
        <span>CampusNotify</span>
      </div>

      <div className="nav-links" role="list">
        <Link
          href="/"
          className={`nav-link${pathname === "/" ? " active" : ""}`}
          role="listitem"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          Priority Inbox
          {unreadCount > 0 && (
            <span className="badge-unread" style={{ marginLeft: 8 }} aria-label={`${unreadCount} unread`}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
        <Link
          href="/feed"
          className={`nav-link${pathname === "/feed" ? " active" : ""}`}
          role="listitem"
          aria-current={pathname === "/feed" ? "page" : undefined}
        >
          All Notifications
        </Link>
      </div>
    </nav>
  );
}
