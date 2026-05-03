import type { Player, ActionApi } from './types.js';

function repeat(player: Player, values: string[]): Promise<{ status: string; repeat: string; error?: string }> {
  let mode = values[0];

  if (mode === "on") {
    mode = "all";
  } else if (mode === "off") {
    mode = "none";
  } else if (mode === "toggle") {
    switch (player.coordinator.state.playMode.repeat) {
      case 'all': mode = "one"; break;
      case 'one': mode = "off"; break;
      default: mode = "all";
    }
  }

  return (player.coordinator as any).repeat(mode)
    .then(() => {
      return { status: 'success', repeat: mode };
    })
    .catch(() => {
      return { status: 'error', error: 'Repeat not supported for current transport', repeat: player.coordinator.state.playMode.repeat };
    });
}

function shuffle(player: Player, values: string[]): Promise<{ status: string; shuffle: boolean }> {
  let enable = values[0] === "on";
  if (values[0] == "toggle") enable = !player.coordinator.state.playMode.shuffle;
  return (player.coordinator as any).shuffle(enable).then(() => {
    return { status: 'success', shuffle: enable };
  });
}

function crossfade(player: Player, values: string[]): Promise<{ status: string; crossfade: boolean; error?: string }> {
  let enable = values[0] === "on";
  if (values[0] == "toggle") enable = !player.coordinator.state.playMode.crossfade;
  return (player.coordinator as any).crossfade(enable)
    .then(() => {
      return { status: 'success', crossfade: enable };
    })
    .catch(() => {
      return { status: 'error', error: 'Crossfade not supported for current transport', crossfade: player.coordinator.state.playMode.crossfade };
    });
}

export default function (api: ActionApi): void {
  api.registerAction('repeat', repeat);
  api.registerAction('shuffle', shuffle);
  api.registerAction('crossfade', crossfade);
}
