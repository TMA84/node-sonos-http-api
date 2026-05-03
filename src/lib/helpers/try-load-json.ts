import fs from 'node:fs';
import JSON5 from 'json5';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

function tryLoadJson(path: string): Record<string, unknown> {
  try {
    const fileContent = fs.readFileSync(path, 'utf-8');
    const parsedContent = JSON5.parse(fileContent) as Record<string, unknown>;
    return parsedContent;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      logger.info(`Could not find file ${path}`);
    } else {
      logger.warn(`Could not read file ${path}, ignoring.`, e);
    }
  }
  return {};
}

export default tryLoadJson;
