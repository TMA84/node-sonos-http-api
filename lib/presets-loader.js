import fs from 'node:fs';
import util from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
import tryLoadJson from './helpers/try-load-json.js';
import settings from '../settings.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PRESETS_PATH = settings.presetDir;
const PRESETS_FILENAME = path.resolve(__dirname, '..', 'presets.json');
const presets = {};

function readPresetsFromDir(presets, presetPath) {
  let files;
  try {
    files = fs.readdirSync(presetPath);
  } catch (e) {
    logger.warn(`Could not find dir ${presetPath}, are you sure it exists?`);
    logger.warn(e.message);
    return;
  }

  files.map((name) => {
    let fullPath = path.join(presetPath, name);
    return {
      name,
      fullPath,
      stat: fs.statSync(fullPath)
    };
  }).filter((file) => {
    return !file.stat.isDirectory() && !file.name.startsWith('.') && file.name.endsWith('.json');
  }).forEach((file) => {
    const presetName = file.name.replace(/\.json/i, '');
    const preset = tryLoadJson(file.fullPath);
    if (Object.keys(preset).length === 0) {
      logger.warn(`could not parse preset file ${file.name}, please make sure syntax conforms with JSON5.`);
      return;
    }

    presets[presetName] = preset;
  });

}

function readPresetsFromFile(presets, filename) {
  try {
    const presetStat = fs.statSync(filename);
    if (!presetStat.isFile()) {
      return;
    }

    const filePresets = require(filename);
    Object.keys(filePresets).forEach(presetName => {
      presets[presetName] = filePresets[presetName];
    });

    logger.warn('You are using a presets.json file! ' +
      'Consider migrating your presets into the presets/ ' +
      'folder instead, and enjoy auto-reloading of presets when you change them');
  } catch (err) {
    logger.debug(`no presets.json file exists, skipping`);
  }
}

function initPresets() {
  Object.keys(presets).forEach(presetName => {
    delete presets[presetName];
  });
  readPresetsFromFile(presets, PRESETS_FILENAME);
  readPresetsFromDir(presets, PRESETS_PATH);

  logger.info('Presets loaded:', util.inspect(presets, { depth: null }));

}

initPresets();
let watchTimeout;
try {
  fs.watch(PRESETS_PATH, { persistent: false }, () => {
    clearTimeout(watchTimeout);
    watchTimeout = setTimeout(initPresets, 200);
  });
} catch (e) {
  logger.warn(`Could not start watching dir ${PRESETS_PATH}, will not auto reload any presets. Make sure the dir exists`);
  logger.warn(e.message);
}

export default presets;
