'use strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

var pausedPlayers = [];

function pauseAll(player, values) {
  logger.debug("pausing all players");
  // save state for resume

  if (values[0] && values[0] > 0) {
    logger.debug("in", values[0], "minutes");
    setTimeout(function () {
      doPauseAll(player.system);
    }, values[0] * 1000 * 60);
    return Promise.resolve();
  }

  return doPauseAll(player.system);
}

function resumeAll(player, values) {
  logger.debug("resuming all players");

  if (values[0] && values[0] > 0) {
    logger.debug("in", values[0], "minutes");
    setTimeout(function () {
      doResumeAll(player.system);
    }, values[0] * 1000 * 60);
    return Promise.resolve();
  }

  return doResumeAll(player.system);
}

function doPauseAll(system) {
  pausedPlayers = [];
  const promises = system.zones
    .filter(zone => {
      const state = zone.coordinator.state.playbackState;
      return state === 'PLAYING' || state === 'TRANSITIONING';
    })
    .map(zone => {
      pausedPlayers.push(zone.uuid);
      const player = system.getPlayerByUUID(zone.uuid);
      return player.pause();
    });
  return Promise.all(promises);
}

function doResumeAll(system) {

  const promises = pausedPlayers.map(uuid => {
    var player = system.getPlayerByUUID(uuid);
    return player.play();
  });

  // Clear the pauseState to prevent a second resume to raise hell
  pausedPlayers = [];

  return Promise.all(promises);
}


export default function (api) {
  api.registerAction('pauseall', pauseAll);
  api.registerAction('resumeall', resumeAll);
}
