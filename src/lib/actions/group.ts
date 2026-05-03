import { createRequire } from 'node:module';
import type { Player, ActionApi } from './types.js';

const require = createRequire(import.meta.url);
const logger = require('sonos-discovery/lib/helpers/logger');

function addToGroup(player: Player, values: string[]): Promise<void> {
  const joiningRoomName = decodeURIComponent(values[0]);
  const joiningPlayer = player.system.getPlayer(joiningRoomName);
  if (!joiningPlayer) {
    logger.warn(`Room ${joiningRoomName} not found - can't group with ${player.roomName}`);
    return Promise.reject(new Error(`Room ${joiningRoomName} not found - can't group with ${player.roomName}`));
  }
  return attachTo(joiningPlayer as unknown as Player, player.coordinator);
}

function joinPlayer(player: Player, values: string[]): Promise<void> {
  const receivingRoomName = decodeURIComponent(values[0]);
  const receivingPlayer = player.system.getPlayer(receivingRoomName);
  if (!receivingPlayer) {
    logger.warn(`Room ${receivingRoomName} not found - can't make ${player.roomName} join it`);
    return Promise.reject(new Error(`Room ${receivingRoomName} not found - can't make ${player.roomName} join it`));
  }
  return attachTo(player, (receivingPlayer as unknown as Player).coordinator);
}

function rinconUri(player: Player): string {
  return `x-rincon:${player.uuid}`;
}

function attachTo(player: Player, coordinator: Player): Promise<void> {
  return player.setAVTransport(rinconUri(coordinator));
}

function isolate(player: Player): Promise<void> {
  return player.becomeCoordinatorOfStandaloneGroup();
}

export default function (api: ActionApi): void {
  api.registerAction('add', addToGroup);
  api.registerAction('isolate', isolate);
  api.registerAction('ungroup', isolate);
  api.registerAction('leave', isolate);
  api.registerAction('join', joinPlayer);
}
