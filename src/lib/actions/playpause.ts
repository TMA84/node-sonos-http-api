import type { Player, ActionApi } from './types.js';

function playpause(player: Player): Promise<{ status: string; paused: boolean }> {
  const ret = { status: 'success', paused: false };
  const state = player.coordinator.state.playbackState;

  if (state === 'PLAYING' || state === 'TRANSITIONING') {
    ret.paused = true;
    return player.coordinator.pause().then(() => { return ret; });
  }

  return player.coordinator.play().then(() => { return ret; });
}

function play(player: Player): Promise<void> {
  return player.coordinator.play();
}

function pause(player: Player): Promise<void> {
  return player.coordinator.pause();
}

export default function (api: ActionApi): void {
  api.registerAction('playpause', playpause);
  api.registerAction('play', play);
  api.registerAction('pause', pause);
}
