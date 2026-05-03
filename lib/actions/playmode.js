'use strict';
function repeat(player, values) {
  let mode = values[0];

  if (mode === "on") {
    mode = "all";
  } else if (mode === "off") {
    mode = "none";
  } else if (mode === "toggle") {
    switch (player.coordinator.state.playMode.repeat) {
      case 'all': mode = "one"; break;
      case 'one': mode = "off"; break;
      default:    mode = "all";
    }
  }

  return player.coordinator.repeat(mode)
    .then((response) => {
      return { status: 'success', repeat: mode };
    })
    .catch((err) => {
      // Repeat may not be supported for the current transport
      return { status: 'error', error: 'Repeat not supported for current transport', repeat: player.coordinator.state.playMode.repeat };
    });
}

function shuffle(player, values) {
  let enable = values[0] === "on";
  if(values[0] == "toggle") enable = !player.coordinator.state.playMode.shuffle;
  return player.coordinator.shuffle(enable).then((response) => {
    return { status: 'success', shuffle: enable };
  });
}

function crossfade(player, values) {
  let enable = values[0] === "on";
  if(values[0] == "toggle") enable = !player.coordinator.state.playMode.crossfade;
  return player.coordinator.crossfade(enable)
    .then((response) => {
      return { status: 'success', crossfade: enable };
    })
    .catch((err) => {
      // Crossfade may not be supported for the current transport (e.g., Alexa-initiated playback)
      return { status: 'error', error: 'Crossfade not supported for current transport', crossfade: player.coordinator.state.playMode.crossfade };
    });
}

export default function (api) {
  api.registerAction('repeat', repeat);
  api.registerAction('shuffle', shuffle);
  api.registerAction('crossfade', crossfade);
}
