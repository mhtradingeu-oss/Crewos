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
    environment: process.env.NODE_ENV || "development",
    ...context,
  };
  // Print as single-line JSON
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level](JSON.stringify(logEntry));
}

function enforceContext(level: LogLevel, message: string, context?: LogContext) {
  if (typeof context !== 'object' || context === null) {
    log("warn", `[logger] ${level} called without context object. Message: ${message}`, { meta: context });
    context = { meta: context };
  }
  log(level, message, context);
}

export const logger = {
  debug: (message: string, context?: LogContext) => enforceContext("debug", message, context),
  info: (message: string, context?: LogContext) => enforceContext("info", message, context),
  warn: (message: string, context?: LogContext) => enforceContext("warn", message, context),
  error: (message: string, context?: LogContext) => enforceContext("error", message, context),
};

// Usage example:
// logger.info("User created", { module: "user", action: "create", correlationId, meta: { userId } });
