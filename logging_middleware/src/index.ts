// index.ts — Public API surface for the logging-middleware package

export { Logger }                  from "./logger";
export { createRequestLogger }     from "./middleware/express";
export { writeToConsole }          from "./transports/console";
export { sendLogToApi }            from "./transports/api";
export type {
  LogStack,
  LogLevel,
  LogPackage,
  BackendPackage,
  FrontendPackage,
  SharedPackage,
  LogEntry,
  LogApiResponse,
  ApiTransportConfig,
  LoggerConfig,
} from "./types";

/**
 * Convenience factory — creates a fully configured Logger in one call.
 *
 * @example
 * import { createLogger } from "logging-middleware";
 * const log = createLogger("backend", process.env.EVAL_AUTH_TOKEN!, "http://20.207.122.201/evaluation-service");
 * log.info("service", "Server started on port 4000");
 */
import { Logger } from "./logger";
import { LogStack, LoggerConfig } from "./types";

export function createLogger(
  stack: LogStack,
  bearerToken?: string,
  baseUrl = "http://20.207.122.201/evaluation-service"
): Logger {
  const config: LoggerConfig = {
    stack,
    minLevel: "debug",
    ...(bearerToken
      ? {
          apiTransport: {
            baseUrl,
            bearerToken,
            timeoutMs: 5000,
            silent: true,
          },
        }
      : {}),
  };
  return new Logger(config);
}
