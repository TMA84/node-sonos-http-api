import { createRequire } from 'node:module';
import type { Player, ActionApi } from './types.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

interface DebugInfo {
  version: string;
  system: {
    localEndpoint: string;
    availableServices: unknown;
  };
  players: Array<{
    roomName: string;
    uuid: string;
    coordinator: string;
    avTransportUri: string;
    avTransportUriMetadata: string;
    enqueuedTransportUri: unknown;
    enqueuedTransportUriMetadata: unknown;
    baseUrl: string;
    state: unknown;
  }>;
}

function debug(player: Player): Promise<DebugInfo> {
  const system = player.system;
  const debugInfo: DebugInfo = {
    version: pkg.version,
    system: {
      localEndpoint: system.localEndpoint,
      availableServices: system.availableServices,
    },
    players: system.players.map((x: any) => ({
      roomName: x.roomName,
      uuid: x.uuid,
      coordinator: x.coordinator.uuid,
      avTransportUri: x.avTransportUri,
      avTransportUriMetadata: x.avTransportUriMetadata,
      enqueuedTransportUri: x.enqueuedTransportUri,
      enqueuedTransportUriMetadata: x.enqueuedTransportUriMetadata,
      baseUrl: x.baseUrl,
      state: x._state
    }))
  };
  return Promise.resolve(debugInfo);
}

export default function (api: ActionApi): void {
  api.registerAction('debug', debug);
}
