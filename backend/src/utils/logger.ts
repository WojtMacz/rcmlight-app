const levels = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof levels)[number];

const currentLevel: Level =
  (process.env.LOG_LEVEL as Level | undefined) ?? 'debug';

function shouldLog(level: Level): boolean {
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
}

function formatMessage(level: Level, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  return meta !== undefined ? `${base} ${JSON.stringify(meta)}` : base;
}

export const logger = {
  debug: (message: string, meta?: unknown): void => {
    if (shouldLog('debug')) console.warn(formatMessage('debug', message, meta));
  },
  info: (message: string, meta?: unknown): void => {
    if (shouldLog('info')) console.warn(formatMessage('info', message, meta));
  },
  warn: (message: string, meta?: unknown): void => {
    if (shouldLog('warn')) console.warn(formatMessage('warn', message, meta));
  },
  error: (message: string, meta?: unknown): void => {
    if (shouldLog('error')) console.error(formatMessage('error', message, meta));
  },
};
