# logging-middleware

A reusable TypeScript logging package for the Affordmed Campus Notifications Platform.

## Features

- **Structured logging** matching the Affordmed evaluation API `Log(stack, level, package, message)` format
- **Dual transports**: colourised console output + remote POST to evaluation `/logs` endpoint
- **Express middleware**: automatic request/response logging with latency
- **Level filtering**: configurable minimum log level
- **Zero-crash design**: remote transport failures are silent by default

## Installation

```bash
cd logging_middleware
npm install
npm run build
```

## Usage

```typescript
import { createLogger } from "logging-middleware";

// Create a backend logger with remote API transport
const log = createLogger(
  "backend",
  process.env.EVAL_AUTH_TOKEN,
  "http://20.207.122.201/evaluation-service"
);

log.info("service", "User registration succeeded");
log.error("db",      "Connection pool exhausted");
log.fatal("config",  "Missing required env variable PORT");
```

### Direct `Log()` call

```typescript
log.Log("controller", "warn", "Invalid request body received");
```

### Express middleware

```typescript
import { createRequestLogger } from "logging-middleware";
app.use(createRequestLogger(log));
// Logs: "Incoming GET /api/v1/notifications" and "GET /api/v1/notifications → 200 (12ms)"
```

## Log API contract

| Field   | Values |
|---------|--------|
| stack   | `backend`, `frontend` |
| level   | `debug`, `info`, `warn`, `error`, `fatal` |
| package | Backend: `cache`, `controller`, `cron_job`, `db`, `domain`, `handler`, `repository`, `route`, `service` |
|         | Frontend: `api`, `component`, `hook`, `page`, `state`, `style` |
|         | Shared: `auth`, `config`, `middleware`, `utils` |

## Package structure

```
src/
├── index.ts              # Public exports + createLogger factory
├── types.ts              # TypeScript interfaces
├── logger.ts             # Core Logger class
├── transports/
│   ├── console.ts        # Colourised terminal output
│   └── api.ts            # Remote evaluation API transport
└── middleware/
    └── express.ts        # Express request logger factory
```
