import type { Player, ActionApi } from './types.js';

function nightMode(player: Player, values: string[]): Promise<{ status: string; nightmode: boolean }> {
  let enable = values[0] === 'on';
  if (values[0] == 'toggle') enable = !player.coordinator.state.equalizer?.nightMode;
  return player.nightMode(enable).then(() => {
    return { status: 'success', nightmode: enable };
  });
}

function speechEnhancement(player: Player, values: string[]): Promise<{ status: string; speechenhancement: boolean }> {
  let enable = values[0] === 'on';
  if (values[0] == 'toggle') enable = !player.coordinator.state.equalizer?.speechEnhancement;
  return player.speechEnhancement(enable).then(() => {
    return { status: 'success', speechenhancement: enable };
  });
}

function bass(player: Player, values: string[]): Promise<unknown> {
  const level = parseInt(values[0], 10);
  return player.setBass(level);
}

function treble(player: Player, values: string[]): Promise<unknown> {
  const level = parseInt(values[0], 10);
  return player.setTreble(level);
}

export default function (api: ActionApi): void {
  api.registerAction('nightmode', nightMode);
  api.registerAction('speechenhancement', speechEnhancement);
  api.registerAction('bass', bass);
  api.registerAction('treble', treble);
}
