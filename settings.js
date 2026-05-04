import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import tryLoadJson from './lib/helpers/try-load-json.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function merge(target, source) {
  Object.keys(source).forEach((key) => {
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
    if ((Object.getPrototypeOf(source[key]) === Object.prototype) && (target[key] !== undefined)) {
      merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
}

var settings = {
  port: 5005,
  ip: "0.0.0.0",
  securePort: 5006,
  cacheDir: path.resolve(__dirname, 'cache'),
  webroot: path.resolve(__dirname, 'static'),
  presetDir: path.resolve(__dirname, 'presets'),
  announceVolume: 40
};

// load user settings
const settingsFileFullPath = path.resolve(__dirname, 'settings.json');
const userSettings = tryLoadJson(settingsFileFullPath);
merge(settings, userSettings);

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
