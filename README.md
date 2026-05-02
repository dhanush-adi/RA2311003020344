# Affordmed Campus Notifications Platform

A full-stack notification management system built for the Affordmed hiring evaluation. This platform features a real-time notification engine, a priority-ranking inbox, and a custom vehicle maintenance scheduler.

**Student Details:**
- **Name**: Dhanush Adi
- **Roll Number**: RA2311003020344
- **GitHub**: dhanush-adi

---

## 🚀 Project Overview

The system is divided into four main components:

1.  **`logging_middleware/`**: A reusable TypeScript package that handles structured logging (Console + Remote API) and Express request monitoring.
2.  **`notification_app_be/`**: A Node.js/Express backend using PostgreSQL for persistent storage and Socket.io for real-time alert delivery.
3.  **`notification_app_fe/`**: A Next.js 14 frontend with a premium dark-mode UI, featuring a Priority Inbox and a live notification feed.
4.  **`vehicle_maintence_scheduler/`**: A standalone optimization engine using a custom 0/1 Knapsack Dynamic Programming algorithm to schedule vehicle tasks.

---

## 📂 Repository Structure

```text
.
├── logging_middleware/          # Reusable logger package
├── notification_app_be/         # Express backend (PostgreSQL + Socket.io)
├── notification_app_fe/         # Next.js frontend (Vanilla CSS)
├── vehicle_maintence_scheduler/ # Custom scheduling algorithm
├── notification_system_design.md # 6-stage architectural documentation
├── README.md                    # Root documentation (this file)
└── .gitignore                   # Project-wide ignore rules
```

---

## 🛠 Features & Implementation

### 1. Priority Inbox Algorithm (Stage 6)
The priority inbox uses a weighting formula to rank notifications:
- **Formula**: `Priority = TypeWeight + RecencyFactor`
- **Type Weights**: Placement (3), Result (2), Event (1).
- **Recency**: `1 / (hours_elapsed + 1)`.
- **Implementation**: Uses a size-bounded **Min-Heap** for efficient top-K retrieval (O(N log K)).

### 2. Vehicle Maintenance Scheduler
- Implements a **0/1 Knapsack Dynamic Programming** algorithm.
- Maximizes total "Impact" within a "Mechanic Hours" budget per depot.
- **Strictly original implementation**: No external algorithm libraries used.

### 3. Real-time Notifications
- Leverages **WebSockets (Socket.io)** for instant delivery of notifications from backend to frontend.
- Fallback to polling implemented in the frontend data layer.

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running on port 5432)

### Backend Setup
```bash
cd notification_app_be
npm install
# Configure .env based on .env.example
npm run db:init  # Initialize SQL schema
npm run dev      # Start dev server (Port 4000)
```

### Frontend Setup
```bash
cd notification_app_fe
npm install
# Configure .env.local
npm run dev      # Start dev server (Port 3000)
```

### Logging Middleware
```bash
cd logging_middleware
npm install
npm run build
```

---

## 📝 Design Documentation
The full architectural breakdown, including database schema, caching strategy, and bulk processing design, is available in [notification_system_design.md](notification_system_design.md).

---

## 📜 License
This project was developed for the Affordmed Hiring Evaluation.
