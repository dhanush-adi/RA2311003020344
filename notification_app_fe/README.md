# Campus Notifications Frontend

Next.js 14 frontend for the Affordmed Campus Notifications Platform.

## Features
- **Priority Inbox**: Displays top-ranked notifications based on urgency and recency.
- **Notification Feed**: Complete history with type-based filtering and pagination.
- **Real-time Badges**: Instant unread count updates via WebSockets.
- **Responsive Design**: Premium dark-mode UI crafted with Vanilla CSS.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Global Variables + BEM inspired components)
- **Icons**: Emoji & Custom CSS Shapes

## Pages
- `/`: Priority Inbox (Top 10).
- `/feed`: Paginated list of all notifications.

## Setup
1. `npm install`
2. Configure `NEXT_PUBLIC_API_BASE` in `.env.local`.
3. `npm run dev`
