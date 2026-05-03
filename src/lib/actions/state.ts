import type { Player, ActionApi } from './types.js';

function state(player: Player): Promise<unknown> {
  return Promise.resolve(player.state);
}

export default function (api: ActionApi): void {
  api.registerAction('state', state);
}
