// types.ts — Core type definitions for the logging middleware

/** Valid stack targets as defined by the Affordmed evaluation API */
export type LogStack = "backend" | "frontend";

/** Severity levels accepted by the evaluation log endpoint */
export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

/**
 * Backend-only package names allowed by the evaluation API.
 * Frontend-only and shared packages are defined separately.
 */
export type BackendPackage =
  | "cache"
  | "controller"
  | "cron_job"
  | "db"
  | "domain"
  | "handler"
  | "repository"
  | "route"
  | "service";

export type FrontendPackage = "api" | "component" | "hook" | "page" | "state" | "style";

export type SharedPackage = "auth" | "config" | "middleware" | "utils";

export type LogPackage = BackendPackage | FrontendPackage | SharedPackage;

/** Shape of a single log entry sent to the evaluation API */
export interface LogEntry {
  stack: LogStack;
  level: LogLevel;
  package: LogPackage;
  message: string;
}

/** Response returned by the evaluation /logs endpoint */
export interface LogApiResponse {
  logID: string;
  message: string;
}

/** Configuration for the remote API transport */
export interface ApiTransportConfig {
  baseUrl: string;
  bearerToken: string;
  timeoutMs?: number;
  /** If true, failures in remote logging do not throw — they silently degrade */
  silent?: boolean;
}

/** Configuration passed when constructing the Logger */
export interface LoggerConfig {
  /** Which stack this logger is bound to */
  stack: LogStack;
  /** Remote API transport config; omit to disable remote logging */
  apiTransport?: ApiTransportConfig;
  /** Minimum level to emit (default: "debug") */
  minLevel?: LogLevel;
}
