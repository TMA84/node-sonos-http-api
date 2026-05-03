import type { Player, ActionApi } from './types.js';

function next(player: Player): Promise<void> {
  return player.coordinator.nextTrack();
}

function previous(player: Player): Promise<void> {
  return player.coordinator.previousTrack();
}

export default function (api: ActionApi): void {
  api.registerAction('next', next);
  api.registerAction('previous', previous);
}
