// logger.ts — Core Logger class: composes transports, enforces log level filtering

import { writeToConsole } from "./transports/console";
import { sendLogToApi }   from "./transports/api";
import {
  LogEntry,
  LogLevel,
  LogPackage,
  LogStack,
  LoggerConfig,
} from "./types";

/** Numeric severity map used for min-level filtering */
const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
  fatal: 4,
};

/**
 * Logger — bound to a single stack (backend | frontend).
 * Dispatches to console transport always, and to the remote API transport
 * when `apiTransport` is provided in config.
 *
 * Usage:
 *   const logger = new Logger({ stack: "backend", apiTransport: { baseUrl, bearerToken } });
 *   logger.Log("service", "info", "User registration succeeded");
 */
export class Logger {
  private readonly stackName: LogStack;
  private readonly config: LoggerConfig;
  private readonly minLevelRank: number;

  constructor(config: LoggerConfig) {
    this.config       = config;
    this.stackName    = config.stack;
    this.minLevelRank = LEVEL_RANK[config.minLevel ?? "debug"];
  }

  /**
   * Core log function matching the evaluation API signature:
   *   Log(stack, level, package, message)
   *
   * @param pkg     - source package (e.g. "service", "controller", "db")
   * @param level   - severity level
   * @param message - descriptive log message
   */
  Log(pkg: LogPackage, level: LogLevel, message: string): void {
    if (LEVEL_RANK[level] < this.minLevelRank) return;

    const entry: LogEntry = {
      stack:   this.stackName,
      level,
      package: pkg,
      message,
    };

    // Always write to console
    writeToConsole(entry);

    // Fire-and-forget to remote API if configured
    if (this.config.apiTransport) {
      sendLogToApi(entry, this.config.apiTransport).catch(() => {
        // Silent by default — remote failure must never crash the app
      });
    }
  }

  // Convenience wrappers
  debug(pkg: LogPackage, message: string): void { this.Log(pkg, "debug", message); }
  info (pkg: LogPackage, message: string): void { this.Log(pkg, "info",  message); }
  warn (pkg: LogPackage, message: string): void { this.Log(pkg, "warn",  message); }
  error(pkg: LogPackage, message: string): void { this.Log(pkg, "error", message); }
  fatal(pkg: LogPackage, message: string): void { this.Log(pkg, "fatal", message); }
}
