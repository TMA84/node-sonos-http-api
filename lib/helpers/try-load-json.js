import fs from 'node:fs';
import JSON5 from 'json5';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

function tryLoadJson(path) {
  try {
    const fileContent = fs.readFileSync(path);
    const parsedContent = JSON5.parse(fileContent);
    return parsedContent;
  } catch (e) {
    if (e.code === 'ENOENT') {
      logger.info(`Could not find file ${path}`);
    } else {
      logger.warn(`Could not read file ${path}, ignoring.`, e);
    }
  }
  return {};
}

export default tryLoadJson;
