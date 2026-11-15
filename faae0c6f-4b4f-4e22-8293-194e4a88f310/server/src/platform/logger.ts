/**
 * Structured, dependency-free logger.
 *
 * Production emits one JSON object per line so log aggregation can parse it;
 * development prints a compact human readable line.
 */
const levelWeight = { debug: 10, info: 20, warn: 30, error: 40 } as const;
export type LogLevel = keyof typeof levelWeight;

const configured = (process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug")) as LogLevel;
const json = process.env.NODE_ENV === "production";

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (levelWeight[level] < (levelWeight[configured] ?? 20)) return;
  const time = new Date().toISOString();
  if (json) {
    process.stdout.write(`${JSON.stringify({ time, level, message, ...context })}\n`);
    return;
  }
  const suffix = context && Object.keys(context).length ? ` ${JSON.stringify(context)}` : "";
  process.stdout.write(`${time} ${level.toUpperCase().padEnd(5)} ${message}${suffix}\n`);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};
