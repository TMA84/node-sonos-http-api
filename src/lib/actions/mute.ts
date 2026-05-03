import type { Player, ActionApi } from './types.js';

function mute(player: Player): Promise<void> {
  return player.mute();
}

function groupMute(player: Player): Promise<void> {
  return player.coordinator.muteGroup();
}

function unmute(player: Player): Promise<void> {
  return player.unMute();
}

function groupUnmute(player: Player): Promise<void> {
  return player.coordinator.unMuteGroup();
}

function toggleMute(player: Player): Promise<{ status: string; muted: boolean }> {
  const ret = { status: 'success', muted: true };

  if (player.state.mute) {
    ret.muted = false;
    return player.unMute().then(() => { return ret; });
  }

  return player.mute().then(() => { return ret; });
}

export default function (api: ActionApi): void {
  api.registerAction('mute', mute);
  api.registerAction('unmute', unmute);
  api.registerAction('groupmute', groupMute);
  api.registerAction('groupunmute', groupUnmute);
  api.registerAction('mutegroup', groupMute);
  api.registerAction('unmutegroup', groupUnmute);
  api.registerAction('togglemute', toggleMute);
}
