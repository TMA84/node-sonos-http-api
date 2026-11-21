'use strict';

function simplifyPlayer(player) {
  return {
    uuid: player.uuid,
    state: player.state,
    playMode: player.currentPlayMode,
    roomName: player.roomName,
    coordinator: player.coordinator ? player.coordinator.uuid : undefined,
    groupState: player.groupState,
    baseUrl: player.baseUrl
  };
}

// During discovery or when a speaker wakes from standby, a zone can briefly
// have no coordinator (or undefined members). Fall back to the first member
// and skip zones with no usable player instead of throwing.
function simplifyZones(zones) {
  return (zones || [])
    .map((zone) => {
      const members = (zone.members || []).filter(Boolean);
      const coordinator = zone.coordinator || members[0];
      if (!coordinator) return null;
      return {
        uuid: zone.uuid,
        coordinator: simplifyPlayer(coordinator),
        members: members.map(simplifyPlayer)
      };
    })
    .filter(Boolean);
}

function zones(player) {
  return Promise.resolve(simplifyZones(player.system.zones));
}

export default function (api) {
  api.registerAction('zones', zones);
}
