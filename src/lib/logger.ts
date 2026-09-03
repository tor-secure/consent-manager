import "server-only";

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const SENSITIVE_KEY_RE =
  /password|secret|token|api[-_]?key|fullKey|rawKey|keyHash|keyPrefix|authorization|cookie|signature|visitorId|requesterEmail|requesterPhone|email|database[_-]?url|connectionString|metadata/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const DB_URL_RE = /postgres(?:ql)?:\/\/[^\s"'`]+/gi;
const CREDENTIAL_RE =
  /\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9]+|\bwhsec_[A-Za-z0-9]+|\bcmp_(?:live|test)_[A-Za-z0-9]+/g;
const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 4;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[MaxDepth]";
  if (value === null || value === undefined) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
      ...(process.env.NODE_ENV !== "production" && value.stack
        ? { stack: sanitizeString(value.stack) }
        : {}),
    };
  }

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: LogContext = {};
    for (const [key, nested] of Object.entries(value as LogContext)) {
      out[key] = SENSITIVE_KEY_RE.test(key)
        ? "[REDACTED]"
        : sanitizeValue(nested, depth + 1);
    }
    return out;
  }

  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  return String(value);
}

function sanitizeString(value: string): string {
  const truncated =
    value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...`
      : value;
  return truncated
    .replace(DB_URL_RE, "[REDACTED_DB_URL]")
    .replace(CREDENTIAL_RE, "[REDACTED_KEY]")
    .replace(EMAIL_RE, "[REDACTED_EMAIL]");
}

export function sanitizeLogContext(context: LogContext = {}): LogContext {
  return sanitizeValue(context) as LogContext;
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: "consent-manager",
    ...(context ? { context: sanitizeLogContext(context) } : {}),
  };

  const serialized = JSON.stringify(entry);
  if (level === "error") {
    console.error(serialized);
  } else if (level === "warn") {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") write("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    write("error", message, context);
  },
};
