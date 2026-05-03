'use strict';
import path from 'node:path';
import settings from '../../settings.js';
import allPlayerAnnouncement from '../helpers/all-player-announcement.js';
import fileDuration from '../helpers/file-duration.js';

let port;

const LOCAL_PATH_LOCATION = path.join(settings.webroot, 'clips');

function playClipOnAll(player, values) {
  const clipFileName = values[0];
  let announceVolume = settings.announceVolume || 40;

  if (/^\d+$/i.test(values[1])) {
    // first parameter is volume
    announceVolume = values[1];
  }

  return fileDuration(path.join(LOCAL_PATH_LOCATION, clipFileName))
      .then((duration) => {
        return allPlayerAnnouncement(player.system, `http://${player.system.localEndpoint}:${port}/clips/${clipFileName}`, announceVolume, duration);
      });
}

export default function (api) {
  port = api.getPort();
  api.registerAction('clipall', playClipOnAll);
}
