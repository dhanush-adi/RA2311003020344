# Campus Notifications Backend

Node.js + TypeScript backend for the Affordmed Campus Notifications Platform.

## Features
- **Express REST API**: Clean routes for notification CRUD and priority inbox.
- **PostgreSQL**: Robust storage with optimized indexing for performance.
- **Socket.io**: Real-time notification delivery.
- **Priority Inbox Service**: Custom Min-Heap implementation for ranking.
- **Logging**: Integrated with the `logging_middleware` package.

## Tech Stack
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express
- **Real-time**: Socket.io
- **Database**: PostgreSQL (pg)

## API Endpoints
- `GET /api/v1/notifications`: Paginated feed.
- `GET /api/v1/notifications/priority-inbox`: Ranked top-K alerts.
- `PATCH /api/v1/notifications/:id/read`: Mark as read.
- `GET /api/v1/vehicles/schedule`: Optimized vehicle maintenance plan.

## Setup
1. `npm install`
2. Create `.env` from `.env.example`.
3. `npm run db:init` to set up tables.
4. `npm run dev` to start.
