import { createRequire } from 'node:module';
import type { Player, ActionApi } from './types.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

const lockVolumes: Record<string, number> = {};

function lockvolumes(player: Player): Promise<void> {
  logger.debug('locking volumes');
  const system = player.system;

  system.players.forEach((p: any) => {
    lockVolumes[p.uuid] = p.state.volume;
  });

  // prevent duplicates, will ignore if no event listener is here
  system.removeListener('volume-change', restrictVolume);
  system.on('volume-change', restrictVolume);
  return Promise.resolve();
}

function unlockvolumes(player: Player): Promise<void> {
  logger.debug('unlocking volumes');
  const system = player.system;
  system.removeListener('volume-change', restrictVolume);
  return Promise.resolve();
}

function restrictVolume(this: any, info: { uuid: string }): void {
  logger.debug(`should revert volume to ${lockVolumes[info.uuid]}`);
  const player = this.getPlayerByUUID(info.uuid);
  // Only do this if volume differs
  if (player.state.volume != lockVolumes[info.uuid])
    return player.setVolume(lockVolumes[info.uuid]);
}

export default function (api: ActionApi): void {
  api.registerAction('lockvolumes', lockvolumes);
  api.registerAction('unlockvolumes', unlockvolumes);
}
