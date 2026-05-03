import type { Player, ActionApi } from './types.js';

function playlist(player: Player, values: string[]): Promise<any> {
  const playlistName = decodeURIComponent(values[0]);
  return (player.coordinator as any)
    .replaceWithPlaylist(playlistName)
    .then(() => player.coordinator.play());
}

export default function (api: ActionApi): void {
  api.registerAction('playlist', playlist);
}
