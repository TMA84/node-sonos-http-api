import type { Settings, LogLevel } from '../../settings.js';

export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

const levels: readonly LogLevel[] = ['error', 'warn', 'info', 'debug'] as const;

export function createLogger(settings: Settings): Logger {
  const threshold = levels.indexOf(settings.log?.level ?? 'info');
  const format = settings.log?.format ?? 'text';

  function shouldLog(level: LogLevel): boolean {
    const levelIndex = levels.indexOf(level);
    return levelIndex <= threshold;
  }

  function formatEntry(level: LogLevel, message: string, args: unknown[]): string {
    const timestamp = new Date().toISOString();

    if (format === 'json') {
      const entry: Record<string, unknown> = {
        timestamp,
        level,
        message,
      };
      if (args.length > 0) {
        entry.args = args;
      }
      return JSON.stringify(entry);
    }

    // text format: [timestamp] [LEVEL] message ...args
    const parts = [`[${timestamp}]`, `[${level.toUpperCase()}]`, message];
    if (args.length > 0) {
      parts.push(...args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ));
    }
    return parts.join(' ');
  }

  function log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!shouldLog(level)) {
      return;
    }
    const output = formatEntry(level, message, args);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  return {
    error: (message: string, ...args: unknown[]) => log('error', message, ...args),
    warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
    info: (message: string, ...args: unknown[]) => log('info', message, ...args),
    debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
  };
}
