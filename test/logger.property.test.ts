// Feature: project-modernization, Property 6: Log Level Filtering
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { createLogger } from '../src/lib/helpers/logger.js';
import type { Settings, LogLevel } from '../src/settings.js';

/**
 * Validates: Requirements 15.2
 *
 * For any configured log level threshold and any log message emitted at a given level,
 * the message SHALL be output if and only if its level is at or above the configured
 * threshold (where error > warn > info > debug).
 */

const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];

function makeSettings(level: LogLevel, format: 'text' | 'json' = 'text'): Settings {
  return {
    port: 5005,
    ip: '0.0.0.0',
    securePort: 5006,
    cacheDir: '/tmp/cache',
    webroot: '/tmp/static',
    presetDir: '/tmp/presets',
    announceVolume: 40,
    log: { level, format },
  };
}

describe('Log Level Filtering (Property 6)', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('messages are emitted iff level index ≤ threshold index', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...levels),
        fc.constantFrom(...levels),
        fc.string({ minLength: 1 }),
        (threshold, messageLevel, message) => {
          // Reset spies for each iteration
          consoleSpy.log.mockClear();
          consoleSpy.warn.mockClear();
          consoleSpy.error.mockClear();

          const logger = createLogger(makeSettings(threshold));
          const thresholdIndex = levels.indexOf(threshold);
          const messageLevelIndex = levels.indexOf(messageLevel);

          // Emit the message at the given level
          logger[messageLevel](message);

          // Count total calls across all console methods
          const totalCalls =
            consoleSpy.log.mock.calls.length +
            consoleSpy.warn.mock.calls.length +
            consoleSpy.error.mock.calls.length;

          // A message is emitted iff its level index ≤ the threshold index
          if (messageLevelIndex <= thresholdIndex) {
            expect(totalCalls).toBe(1);
          } else {
            expect(totalCalls).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: project-modernization, Property 7: Log Entry Structure

/**
 * Validates: Requirements 15.3, 15.4
 *
 * For any log message string and log level, the formatted log entry SHALL contain
 * a valid ISO 8601 timestamp, the level name, and the original message text.
 * When format is `json`, the output SHALL be valid JSON parseable to an object
 * with `timestamp`, `level`, and `message` fields.
 */

describe('Log Entry Structure (Property 7)', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('JSON format entries are parseable and contain timestamp, level, and message', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...levels),
        fc.string({ minLength: 1 }),
        (messageLevel, message) => {
          consoleSpy.log.mockClear();
          consoleSpy.warn.mockClear();
          consoleSpy.error.mockClear();

          // Use 'debug' threshold so all messages are emitted
          const logger = createLogger(makeSettings('debug', 'json'));
          logger[messageLevel](message);

          // Get the output from the appropriate console method
          let output: string;
          if (messageLevel === 'error') {
            output = consoleSpy.error.mock.calls[0][0] as string;
          } else if (messageLevel === 'warn') {
            output = consoleSpy.warn.mock.calls[0][0] as string;
          } else {
            output = consoleSpy.log.mock.calls[0][0] as string;
          }

          // Must be valid JSON
          const parsed = JSON.parse(output);

          // Must contain required fields
          expect(parsed).toHaveProperty('timestamp');
          expect(parsed).toHaveProperty('level', messageLevel);
          expect(parsed).toHaveProperty('message', message);

          // Timestamp must be valid ISO 8601
          const date = new Date(parsed.timestamp);
          expect(date.toISOString()).toBe(parsed.timestamp);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('text format entries contain ISO 8601 timestamp, level, and message', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...levels),
        // Avoid strings with newlines/special chars that could break the text format matching
        fc.string({ minLength: 1 }).filter((s) => !s.includes('\n') && !s.includes('\r')),
        (messageLevel, message) => {
          consoleSpy.log.mockClear();
          consoleSpy.warn.mockClear();
          consoleSpy.error.mockClear();

          // Use 'debug' threshold so all messages are emitted
          const logger = createLogger(makeSettings('debug', 'text'));
          logger[messageLevel](message);

          // Get the output from the appropriate console method
          let output: string;
          if (messageLevel === 'error') {
            output = consoleSpy.error.mock.calls[0][0] as string;
          } else if (messageLevel === 'warn') {
            output = consoleSpy.warn.mock.calls[0][0] as string;
          } else {
            output = consoleSpy.log.mock.calls[0][0] as string;
          }

          // Must contain the level in uppercase brackets
          expect(output).toContain(`[${messageLevel.toUpperCase()}]`);

          // Must contain the message
          expect(output).toContain(message);

          // Must contain a valid ISO 8601 timestamp in brackets
          const timestampMatch = output.match(/^\[(.+?)\]/);
          expect(timestampMatch).not.toBeNull();
          const date = new Date(timestampMatch![1]);
          expect(date.toISOString()).toBe(timestampMatch![1]);
        }
      ),
      { numRuns: 100 }
    );
  });
});
