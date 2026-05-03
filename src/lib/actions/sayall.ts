import tryDownloadTTS from '../helpers/try-download-tts.js';
import allPlayerAnnouncement from '../helpers/all-player-announcement.js';
import settings from '../../settings.js';
import type { Player, ActionApi } from './types.js';

let port: number;

function sayAll(player: Player, values: string[]): Promise<any> {
  let text: string;
  try {
    text = decodeURIComponent(values[0]);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = `The encoded phrase ${values[0]} could not be URI decoded. Make sure your url encoded values (%xx) are within valid ranges. xx should be hexadecimal representations`;
    }
    return Promise.reject(err);
  }
  let announceVolume: string | number;
  let language: string | undefined;

  if (/^\d+$/i.test(values[1])) {
    // first parameter is volume
    announceVolume = values[1];
  } else {
    language = values[1];
    announceVolume = values[2] || settings.announceVolume || 40;
  }

  return tryDownloadTTS(text, language || '')
    .then((result: any) => {
      return allPlayerAnnouncement(player.system as any, `http://${(player.system as any).localEndpoint}:${port}${result.uri}`, Number(announceVolume), result.duration);
    });
}

export default function (api: ActionApi): void {
  port = api.getPort();
  api.registerAction('sayall', sayAll);
}
