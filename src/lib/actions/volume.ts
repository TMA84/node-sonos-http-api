import type { Player, ActionApi } from './types.js';

function volume(player: Player, values: string[]): Promise<void> {
  const vol = values[0];
  return player.setVolume(vol as any);
}

function groupVolume(player: Player, values: string[]): Promise<void> {
  return player.coordinator.setGroupVolume(values[0] as any);
}

export default function (api: ActionApi): void {
  api.registerAction('volume', volume);
  api.registerAction('groupvolume', groupVolume);
}
