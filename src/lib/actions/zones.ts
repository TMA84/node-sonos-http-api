import type { Player, ActionApi } from './types.js';

function simplifyPlayer(player: any): any {
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
function simplifyZones(zones: any[]): any[] {
  return (zones || [])
    .map((zone: any) => {
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

function zones(player: Player): Promise<any> {
  return Promise.resolve(simplifyZones((player.system as any).zones));
}

export default function (api: ActionApi): void {
  api.registerAction('zones', zones);
}
