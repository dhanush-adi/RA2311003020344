// transports/console.ts — Colourised console output transport

import { LogEntry, LogLevel } from "../types";

/** ANSI colour codes indexed by log level */
const LEVEL_COLOURS: Record<LogLevel, string> = {
  debug: "\x1b[37m",  // white
  info:  "\x1b[36m",  // cyan
  warn:  "\x1b[33m",  // yellow
  error: "\x1b[31m",  // red
  fatal: "\x1b[35m",  // magenta
};

const RESET = "\x1b[0m";
const DIM   = "\x1b[2m";

function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Writes a formatted, colourised log line to stdout/stderr.
 * Fatal and error levels go to stderr; others to stdout.
 */
export function writeToConsole(entry: LogEntry): void {
  const colour = LEVEL_COLOURS[entry.level];
  const ts = formatTimestamp();
  const levelTag = entry.level.toUpperCase().padEnd(5);
  const line = `${DIM}${ts}${RESET} ${colour}[${levelTag}]${RESET} ${DIM}[${entry.stack}:${entry.package}]${RESET} ${entry.message}`;

  if (entry.level === "error" || entry.level === "fatal") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}
