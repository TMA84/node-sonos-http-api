import type { Player, ActionApi } from './types.js';

function favorites(player: Player, values: string[]): Promise<unknown> {
  return player.system.getFavorites()
    .then((favorites) => {
      const favList = favorites as any[];
      if (values[0] === 'detailed') {
        return favList;
      }

      // only present relevant data
      return favList.map((i: any) => i.title);
    });
}

export default function (api: ActionApi): void {
  api.registerAction('favorites', favorites);
  api.registerAction('favourites', favorites);
}
