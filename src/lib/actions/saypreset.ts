import { createRequire } from 'node:module';
import tryDownloadTTS from '../helpers/try-download-tts.js';
import presetAnnouncement from '../helpers/preset-announcement.js';
import type { Player, ActionApi } from './types.js';

const require = createRequire(import.meta.url);
const presets: Record<string, any> = require('../../lib/presets-loader.js');

let port: number;

function sayPreset(player: Player, values: string[]): Promise<any> {
  const presetName = decodeURIComponent(values[0]);

  const preset = presets[presetName];

  if (!preset) {
    return Promise.reject(new Error(`No preset named ${presetName} could be found`));
  }

  let text: string;
  try {
    text = decodeURIComponent(values[1]);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = `The encoded phrase ${values[0]} could not be URI decoded. Make sure your url encoded values (%xx) are within valid ranges. xx should be hexadecimal representations`;
    }
    return Promise.reject(err);
  }

  const language = values[2];

  return tryDownloadTTS(text, language)
    .then((result: any) => {
      return presetAnnouncement(player.system as any, `http://${(player.system as any).localEndpoint}:${port}${result.uri}`, preset, result.duration);
    });
}

export default function (api: ActionApi): void {
  port = api.getPort();
  api.registerAction('saypreset', sayPreset);
}
