import type { Player, ActionApi } from './types.js';

function services(player: Player, values: string[]): Promise<any> {
  if (values[0] === 'all') {
    return Promise.resolve((player.system as any).availableServices);
  }

  return Promise.resolve();
}

export default function (api: ActionApi): void {
  api.registerAction('services', services);
}
