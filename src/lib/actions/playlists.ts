import type { Player, ActionApi } from './types.js';

function playlists(player: Player, values: string[]): Promise<any> {
  return (player.system.getPlaylists() as Promise<any[]>)
    .then((playlists) => {
      if (values[0] === 'detailed') {
        return playlists;
      }

      // only present relevant data
      const simplePlaylists: string[] = [];
      playlists.forEach(function (i: any) {
        simplePlaylists.push(i.title);
      });

      return simplePlaylists;
    });
}

export default function (api: ActionApi): void {
  api.registerAction('playlists', playlists);
}
