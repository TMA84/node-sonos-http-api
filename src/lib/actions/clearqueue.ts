import type { Player, ActionApi } from './types.js';

function clearqueue(player: Player): Promise<unknown> {
  return player.coordinator.clearQueue();
}

export default function (api: ActionApi): void {
  api.registerAction('clearqueue', clearqueue);
}
