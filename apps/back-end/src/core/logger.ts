
import { env } from "./config/env.js";

const LEVELS = ["debug", "info", "warn", "error"] as const;
type LogLevel = typeof LEVELS[number];

interface LogContext {
  module?: string;
  action?: string;
  correlationId?: string;
  eventName?: string;
  meta?: any;
  [key: string]: any;
}

function log(level: LogLevel, message: string, context: LogContext = {}) {
  if (!LEVELS.includes(level)) level = "info";
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    environment: env?.NODE_ENV || process.env.NODE_ENV || "development",
    ...context,
  };
  // Print as single-line JSON
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level](JSON.stringify(logEntry));
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};

// Usage example:
// logger.info("User created", { module: "user", action: "create", correlationId, meta: { userId } });
