import { createRequire } from 'node:module';
import type { Player, ActionApi } from './types.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

let pausedPlayers: string[] = [];

function pauseAll(player: Player, values: string[]): Promise<any> {
  logger.debug("pausing all players");

  if (values[0] && parseInt(values[0]) > 0) {
    logger.debug("in", values[0], "minutes");
    setTimeout(function () {
      doPauseAll(player.system);
    }, parseInt(values[0]) * 1000 * 60);
    return Promise.resolve();
  }

  return doPauseAll(player.system);
}

function resumeAll(player: Player, values: string[]): Promise<any> {
  logger.debug("resuming all players");

  if (values[0] && parseInt(values[0]) > 0) {
    logger.debug("in", values[0], "minutes");
    setTimeout(function () {
      doResumeAll(player.system);
    }, parseInt(values[0]) * 1000 * 60);
    return Promise.resolve();
  }

  return doResumeAll(player.system);
}

function doPauseAll(system: any): Promise<any> {
  pausedPlayers = [];
  const promises = system.zones
    .filter((zone: any) => {
      const state = zone.coordinator.state.playbackState;
      return state === 'PLAYING' || state === 'TRANSITIONING';
    })
    .map((zone: any) => {
      pausedPlayers.push(zone.uuid);
      const player = system.getPlayerByUUID(zone.uuid);
      return player.pause();
    });
  return Promise.all(promises);
}

function doResumeAll(system: any): Promise<any> {
  const promises = pausedPlayers.map((uuid: string) => {
    const player = system.getPlayerByUUID(uuid);
    return player.play();
  });

  // Clear the pauseState to prevent a second resume to raise hell
  pausedPlayers = [];

  return Promise.all(promises);
}

export default function (api: ActionApi): void {
  api.registerAction('pauseall', pauseAll);
  api.registerAction('resumeall', resumeAll);
}
