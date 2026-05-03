import type { Player, ActionApi } from './types.js';

function simplifyPlayer(player: any): any {
  return {
    uuid: player.uuid,
    state: player.state,
    playMode: player.currentPlayMode,
    roomName: player.roomName,
    coordinator: player.coordinator.uuid,
    groupState: player.groupState,
    baseUrl: player.baseUrl
  };
}

function simplifyZones(zones: any[]): any[] {
  return zones.map((zone) => {
    return {
      uuid: zone.uuid,
      coordinator: simplifyPlayer(zone.coordinator),
      members: zone.members.map(simplifyPlayer)
    };
  });
}

function zones(player: Player): Promise<any> {
  return Promise.resolve(simplifyZones((player.system as any).zones));
}

export default function (api: ActionApi): void {
  api.registerAction('zones', zones);
}
