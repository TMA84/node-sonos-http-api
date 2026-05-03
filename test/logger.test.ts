import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../src/lib/helpers/logger.js';
import type { Settings } from '../src/settings.js';

function makeSettings(overrides: Partial<Settings['log']> = {}): Settings {
  return {
    port: 5005,
    ip: '0.0.0.0',
    securePort: 5006,
    cacheDir: '/tmp/cache',
    webroot: '/tmp/static',
    presetDir: '/tmp/presets',
    announceVolume: 40,
    log: { level: 'debug', format: 'text', ...overrides },
  };
}

describe('createLogger', () => {
  let consoleSpy: { log: ReturnType<typeof vi.spyOn>; warn: ReturnType<typeof vi.spyOn>; error: ReturnType<typeof vi.spyOn> };

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

  describe('level threshold filtering', () => {
    it('logs all levels when threshold is debug', () => {
      const logger = createLogger(makeSettings({ level: 'debug' }));
      logger.error('e');
      logger.warn('w');
      logger.info('i');
      logger.debug('d');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // info + debug
    });

    it('filters debug when threshold is info', () => {
      const logger = createLogger(makeSettings({ level: 'info' }));
      logger.error('e');
      logger.warn('w');
      logger.info('i');
      logger.debug('d');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1); // info only
    });

    it('filters info and debug when threshold is warn', () => {
      const logger = createLogger(makeSettings({ level: 'warn' }));
      logger.error('e');
      logger.warn('w');
      logger.info('i');
      logger.debug('d');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('only logs errors when threshold is error', () => {
      const logger = createLogger(makeSettings({ level: 'error' }));
      logger.error('e');
      logger.warn('w');
      logger.info('i');
      logger.debug('d');

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('defaults to info level when no log config is provided', () => {
      const settings: Settings = {
        port: 5005, ip: '0.0.0.0', securePort: 5006,
        cacheDir: '/tmp', webroot: '/tmp', presetDir: '/tmp', announceVolume: 40,
      };
      const logger = createLogger(settings);
      logger.info('visible');
      logger.debug('hidden');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('text format', () => {
    it('includes timestamp, level, and message', () => {
      const logger = createLogger(makeSettings({ format: 'text' }));
      logger.info('hello world');

      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toMatch(/^\[.+\] \[INFO\] hello world$/);
    });

    it('includes ISO 8601 timestamp', () => {
      const logger = createLogger(makeSettings({ format: 'text' }));
      logger.info('test');

      const output = consoleSpy.log.mock.calls[0][0] as string;
      const timestampMatch = output.match(/^\[(.+?)\]/);
      expect(timestampMatch).not.toBeNull();
      const date = new Date(timestampMatch![1]);
      expect(date.toISOString()).toBe(timestampMatch![1]);
    });

    it('appends extra args to the message', () => {
      const logger = createLogger(makeSettings({ format: 'text' }));
      logger.info('msg', 'extra', 42);

      const output = consoleSpy.log.mock.calls[0][0] as string;
      expect(output).toContain('msg extra 42');
    });
  });

  describe('json format', () => {
    it('outputs valid JSON with timestamp, level, and message', () => {
      const logger = createLogger(makeSettings({ format: 'json' }));
      logger.info('hello');

      const output = consoleSpy.log.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed).toHaveProperty('level', 'info');
      expect(parsed).toHaveProperty('message', 'hello');
    });

    it('includes valid ISO 8601 timestamp', () => {
      const logger = createLogger(makeSettings({ format: 'json' }));
      logger.warn('test');

      const output = consoleSpy.warn.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      const date = new Date(parsed.timestamp);
      expect(date.toISOString()).toBe(parsed.timestamp);
    });

    it('includes args when provided', () => {
      const logger = createLogger(makeSettings({ format: 'json' }));
      logger.info('msg', { key: 'value' });

      const output = consoleSpy.log.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed.args).toEqual([{ key: 'value' }]);
    });

    it('omits args field when no extra args', () => {
      const logger = createLogger(makeSettings({ format: 'json' }));
      logger.info('msg');

      const output = consoleSpy.log.mock.calls[0][0] as string;
      const parsed = JSON.parse(output);
      expect(parsed).not.toHaveProperty('args');
    });
  });

  describe('console method routing', () => {
    it('uses console.error for error level', () => {
      const logger = createLogger(makeSettings());
      logger.error('oops');
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('uses console.warn for warn level', () => {
      const logger = createLogger(makeSettings());
      logger.warn('careful');
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });

    it('uses console.log for info level', () => {
      const logger = createLogger(makeSettings());
      logger.info('fyi');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it('uses console.log for debug level', () => {
      const logger = createLogger(makeSettings());
      logger.debug('details');
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });
  });
});
