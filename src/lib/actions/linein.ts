import type { Player, ActionApi } from './types.js';

function linein(player: Player, values: string[]): Promise<void> {
  const sourcePlayerName = values[0];
  let lineinSourcePlayer: Player | undefined = player;

  if (sourcePlayerName) {
    lineinSourcePlayer = player.system.getPlayer(decodeURIComponent(sourcePlayerName)) as unknown as Player | undefined;
  }

  if (!lineinSourcePlayer) {
    return Promise.reject(new Error(`Could not find player ${sourcePlayerName}`));
  }

  const uri = `x-rincon-stream:${lineinSourcePlayer.uuid}`;

  return player.coordinator.setAVTransport(uri)
    .then(() => player.coordinator.play());
}

export default function (api: ActionApi): void {
  api.registerAction('linein', linein);
}
