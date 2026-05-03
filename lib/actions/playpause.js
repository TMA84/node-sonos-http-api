'use strict';
function playpause(player) {
  let ret = { status: 'success', paused: false };
  const state = player.coordinator.state.playbackState;

  if (state === 'PLAYING' || state === 'TRANSITIONING') {
    ret.paused = true;
    return player.coordinator.pause().then((response) => { return ret; });
  }

  return player.coordinator.play().then((response) => { return ret; });
}

function play(player) {
 return player.coordinator.play();
}

function pause(player) {
  return player.coordinator.pause();
}

export default function (api) {
  api.registerAction('playpause', playpause);
  api.registerAction('play', play);
  api.registerAction('pause', pause);
}
