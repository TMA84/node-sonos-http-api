import type { Player, ActionApi } from './types.js';

function simplify(items: any[]): any[] {
  return items.map(item => {
    return {
      title: item.title,
      artist: item.artist,
      album: item.album,
      albumArtUri: item.albumArtUri
    };
  });
}

function queue(player: Player, values: string[]): Promise<any> {
  const detailed = values[values.length - 1] === 'detailed';
  let limit: number | undefined;
  let offset: number | undefined;

  if (/\d+/.test(values[0])) {
    limit = parseInt(values[0]);
  }

  if (/\d+/.test(values[1])) {
    offset = parseInt(values[1]);
  }

  const promise = (player.coordinator as any).getQueue(limit, offset) as Promise<any[]>;

  if (detailed) {
    return promise;
  }

  return promise.then(simplify);
}

export default function (api: ActionApi): void {
  api.registerAction('queue', queue);
}
