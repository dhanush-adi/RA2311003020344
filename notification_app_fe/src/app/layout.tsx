// src/app/layout.tsx — Root layout with fonts and global styles

import type { Metadata } from "next";
import "./globals.css";
import "./components.css";

export const metadata: Metadata = {
  title: "CampusNotify — Priority Inbox",
  description: "Campus Notifications Platform — real-time placement, result, and event alerts for students",
  keywords: ["campus", "notifications", "placement", "university", "affordmed"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
