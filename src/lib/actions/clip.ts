import path from 'node:path';
import fileDuration from '../helpers/file-duration.js';
import settings from '../../settings.js';
import singlePlayerAnnouncement from '../helpers/single-player-announcement.js';
import type { Player, ActionApi } from './types.js';

let port: number;

const LOCAL_PATH_LOCATION = path.join(settings.webroot, 'clips');

function playClip(player: Player, values: string[]): Promise<void> {
  const clipFileName = values[0];
  let announceVolume: number = settings.announceVolume || 40;

  if (/^\d+$/i.test(values[1])) {
    announceVolume = parseInt(values[1], 10);
  }

  return fileDuration(path.join(LOCAL_PATH_LOCATION, clipFileName))
    .then((duration) => {
      return singlePlayerAnnouncement(player as any, `http://${player.system.localEndpoint}:${port}/clips/${clipFileName}`, announceVolume, duration);
    });
}

export default function (api: ActionApi): void {
  port = api.getPort();
  api.registerAction('clip', playClip);
}
