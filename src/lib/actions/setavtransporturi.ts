import type { Player, ActionApi } from './types.js';

function setAVTransportURI(player: Player, values: string[]): Promise<void> {
  return player.setAVTransport(decodeURIComponent(values[0]));
}

export default function (api: ActionApi): void {
  api.registerAction('setavtransporturi', setAVTransportURI);
}
