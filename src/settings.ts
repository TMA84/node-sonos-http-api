import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import tryLoadJson from './lib/helpers/try-load-json.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Settings {
  port: number;
  ip: string;
  securePort: number;
  cacheDir: string;
  webroot: string;
  presetDir: string;
  announceVolume: number;
  auth?: { username: string; password: string };
  https?: { pfx?: string; passphrase?: string; key?: string; cert?: string };
  aws?: { credentials?: object; name?: string; region?: string };
  webhook?: string;
  webhookType?: string;
  webhookData?: string;
  webhookHeaderName?: string;
  webhookHeaderContents?: string;
  log?: { level?: LogLevel; format?: 'text' | 'json' };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

export function merge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    if (isPlainObject(sourceVal) && isPlainObject(target[key])) {
      merge(target[key] as Record<string, unknown>, sourceVal as Record<string, unknown>);
    } else {
      target[key] = sourceVal;
    }
  }
  return target;
}

const settings: Settings = {
  port: 5005,
  ip: '0.0.0.0',
  securePort: 5006,
  cacheDir: path.resolve(__dirname, '..', 'cache'),
  webroot: path.resolve(__dirname, '..', 'static'),
  presetDir: path.resolve(__dirname, '..', 'presets'),
  announceVolume: 40,
};

// load user settings
const settingsFileFullPath = path.resolve(__dirname, '..', 'settings.json');
const userSettings = tryLoadJson(settingsFileFullPath) as Record<string, unknown>;
merge(settings as unknown as Record<string, unknown>, userSettings);

logger.debug(settings);

if (!fs.existsSync(settings.webroot + '/tts/')) {
  fs.mkdirSync(settings.webroot + '/tts/');
}

if (!fs.existsSync(settings.cacheDir)) {
  try {
    fs.mkdirSync(settings.cacheDir);
  } catch (err) {
    logger.warn(`Could not create cache directory ${settings.cacheDir}, please create it manually for all features to work.`);
  }
}

export default settings;
