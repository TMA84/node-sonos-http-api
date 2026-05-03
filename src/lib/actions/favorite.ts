import type { Player, ActionApi } from './types.js';

function favorite(player: Player, values: string[]): Promise<void> {
  return player.coordinator.replaceWithFavorite(decodeURIComponent(values[0]))
    .then(() => player.coordinator.play());
}

export default function (api: ActionApi): void {
  api.registerAction('favorite', favorite);
  api.registerAction('favourite', favorite);
}
