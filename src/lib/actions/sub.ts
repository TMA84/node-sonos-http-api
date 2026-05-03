import type { Player, ActionApi } from './types.js';

function sub(player: Player, values: string[]): Promise<any> {
  if (!player.hasSub) {
    return Promise.reject(new Error('This zone doesn\'t have a SUB connected'));
  }

  const action = values[0];
  const value = values[1];

  switch (action) {
    case 'on':
      return (player as any).subEnable();
    case 'off':
      return (player as any).subDisable();
    case 'gain':
      return (player as any).subGain(value);
    case 'crossover':
      return (player as any).subCrossover(value);
    case 'polarity':
      return (player as any).subPolarity(value);
  }

  return Promise.resolve({
    message: 'Valid options are on, off, gain, crossover, polarity'
  });
}

export default function (api: ActionApi): void {
  api.registerAction('sub', sub);
}
