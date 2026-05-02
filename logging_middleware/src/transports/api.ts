// transports/api.ts — Remote API transport: posts log entries to evaluation server

import axios, { AxiosInstance } from "axios";
import { ApiTransportConfig, LogEntry, LogApiResponse } from "../types";

/**
 * Sends a log entry to the Affordmed evaluation /logs endpoint.
 * Fails silently (logs to stderr) if `silent` is true in config.
 */
export async function sendLogToApi(
  entry: LogEntry,
  config: ApiTransportConfig
): Promise<LogApiResponse | null> {
  const { baseUrl, bearerToken, timeoutMs = 5000, silent = true } = config;

  try {
    const response = await axios.post<LogApiResponse>(
      `${baseUrl}/logs`,
      {
        stack:   entry.stack,
        level:   entry.level,
        package: entry.package,
        message: entry.message,
      },
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
        timeout: timeoutMs,
      }
    );
    return response.data;
  } catch (transportErr: unknown) {
    if (!silent) {
      const msg = transportErr instanceof Error ? transportErr.message : String(transportErr);
      process.stderr.write(`[logging-middleware/api-transport] Remote log failed: ${msg}\n`);
    }
    return null;
  }
}
