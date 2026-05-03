import type { Player, ActionApi } from './types.js';

function reindex(player: Player): Promise<unknown> {
  return player.system.refreshShareIndex();
}

export default function (api: ActionApi): void {
  api.registerAction('reindex', reindex);
}
