import type { Player, ActionApi } from './types.js';

function timeSeek(player: Player, values: string[]): Promise<void> {
  return player.coordinator.timeSeek(values[0] as any);
}

function trackSeek(player: Player, values: string[]): Promise<void> {
  return player.coordinator.trackSeek((values[0] as any) * 1);
}

export default function (api: ActionApi): void {
  api.registerAction('seek', timeSeek); // deprecated
  api.registerAction('timeseek', timeSeek);
  api.registerAction('trackseek', trackSeek);
}
