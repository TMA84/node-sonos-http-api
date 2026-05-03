import path from 'node:path';
import settings from '../../settings.js';
import presetAnnouncement from '../helpers/preset-announcement.js';
import fileDuration from '../helpers/file-duration.js';
import type { Player, ActionApi } from './types.js';

let port: number;
const LOCAL_PATH_LOCATION = path.join(settings.webroot, 'clips');

const presets: Record<string, any> = {};

function playClipOnPreset(player: Player, values: string[]): Promise<void> {
  const presetName = decodeURIComponent(values[0]);
  const clipFileName = decodeURIComponent(values[1]);

  const preset = presets[presetName];

  if (!preset) {
    return Promise.reject(new Error(`No preset named ${presetName} could be found`));
  }

  return fileDuration(path.join(LOCAL_PATH_LOCATION, clipFileName))
    .then((duration) => {
      return presetAnnouncement(player.system as any, `http://${player.system.localEndpoint}:${port}/clips/${clipFileName}`, preset, duration);
    });
}

export default function (api: ActionApi): void {
  port = api.getPort();
  api.registerAction('clippreset', playClipOnPreset);
}
