import type { Player, ActionApi } from './types.js';

function sleep(player: Player, values: string[]): Promise<unknown> {
  let timestamp: string | number = 0;
  if (/^\d+$/.test(values[0])) {
    // only digits
    timestamp = values[0];
  } else if (values[0].toLowerCase() != 'off') {
    // broken input
    return Promise.resolve();
  }
  return (player.coordinator as any).sleep(timestamp);
}

export default function (api: ActionApi): void {
  api.registerAction('sleep', sleep);
}
