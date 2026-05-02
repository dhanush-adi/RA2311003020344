// src/server.ts — Application entry point

import * as dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import { createLogger, createRequestLogger } from "../../logging_middleware/src";
import { verifyDbConnection } from "./config/db";
import { notifRouter }  from "./routes/notificationRoutes";
import { vehicleRouter } from "./routes/vehicleRoutes";
import { globalErrorHandler, notFoundHandler } from "./middleware/errorHandler";

const serverLogger = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  process.env.EVAL_API_BASE
);

const PORT            = parseInt(process.env.PORT ?? "4000", 10);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

const app        = express();
const httpServer = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  const studentId = socket.handshake.query.studentId as string | undefined;
  if (studentId) {
    socket.join(`student:${studentId}`);
    serverLogger.info("middleware", `Socket connected: student=${studentId} socketId=${socket.id}`);
  }

  socket.on("notification:read_ack", (data: { notificationId: string }) => {
    serverLogger.debug("middleware", `Read ack received: notif=${data.notificationId}`);
  });

  socket.on("disconnect", () => {
    serverLogger.info("middleware", `Socket disconnected: socketId=${socket.id}`);
  });
});

// Make io accessible in controllers via req.app.get("io")
app.set("io", io);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "1mb" }));
app.use(createRequestLogger(serverLogger));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/v1/notifications", notifRouter);
app.use("/api/v1/vehicles",      vehicleRouter);

// Health check
app.get("/health", (_req, res) => {
  serverLogger.debug("route", "Health check hit");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  try {
    serverLogger.info("config", "Starting Campus Notifications Backend...");
    await verifyDbConnection();
    httpServer.listen(PORT, () => {
      serverLogger.info("config", `Server listening on http://localhost:${PORT}`);
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    serverLogger.fatal("config", `Bootstrap failed: ${msg}`);
    process.exit(1);
  }
}

bootstrap();
